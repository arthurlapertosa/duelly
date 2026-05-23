import type { FastifyReply, FastifyRequest } from 'fastify';
import { httpError } from '../../modules/orchestration/services.js';
import {
  bigintField,
  findTemplate,
  numberField,
  objectField,
  objectBody,
  optionalString,
  permitField,
  publicInvite,
  stringField,
  wrap,
} from './helpers.js';
import type { AuthedRequest, OrchestrationControllerContext } from './orchestration-controller.context.js';

export class InvitesController {
  constructor(private readonly context: OrchestrationControllerContext) {}

  create = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    const body = objectBody(request.body);
    const template = await this.context.templates.findTemplateForSelection(stringField(body, 'templateId'), {});
    if (!template) throw httpError(404, 'TEMPLATE_NOT_FOUND');
    await this.context.templates.assertTemplateAvailableForInvite(template);
    const stake = bigintField(body, 'stake');
    const loserFee = BigInt((await this.context.fees.quote(stake, template.loserFeeBps)).selectedLoserFeeRaw);
    if (body.loserFee !== undefined && bigintField(body, 'loserFee') !== loserFee) {
      throw httpError(400, 'LOSER_FEE_MISMATCH');
    }
    const invite = await this.context.invites.create(
      user,
      template,
      stake,
      loserFee,
      numberField(body, 'makerOutcomeIndex'),
      optionalString(body, 'takerAddress'),
      optionalString(body, 'recipientEmail'),
    );
    const requiredFunding = BigInt(invite.stake) + BigInt(invite.loserFee);
    const deadline = BigInt(Math.floor(invite.expiresAt.getTime() / 1000));
    return {
      invite: publicInvite(invite, user),
      offerPayload: invite.offerPayload,
      makerPermitPayload: await this.context.brl1.permitPayloadForAddress(invite.makerAddress, requiredFunding, deadline),
      requiredFundingRaw: requiredFunding.toString(),
      shareable: false,
    };
  });

  get = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const invite = await this.context.repository.findInvite(stringField(params, 'inviteId'));
    if (!invite || invite.status === 'draft' || invite.status === 'cancelled' || !invite.offerSignature || !invite.makerAuthorizedAt) {
      throw httpError(404, 'INVITE_NOT_FOUND');
    }
    const template = await findTemplate(this.context, invite.templateHash, {});
    const authorization = Array.isArray(request.headers.authorization) ? request.headers.authorization[0] : request.headers.authorization;
    const viewer = await this.context.auth.authenticate(authorization);
    return {
      invite: publicInvite(invite, viewer?.user),
      template,
      offerPayload: invite.offerPayload,
      acceptancePayload: invite.acceptancePayload,
      requiredFundingRaw: (BigInt(invite.stake) + BigInt(invite.loserFee)).toString(),
      shareable: true,
    };
  });

  pending = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    const invites = await this.context.repository.findPendingInvitesByRecipientEmail(user.email, user.id);
    const pending = await Promise.all(invites.map(async (invite) => ({
      invite: publicInvite(invite, user),
      template: await findTemplate(this.context, invite.templateHash, {}) ?? null,
      requiredFundingRaw: (BigInt(invite.stake) + BigInt(invite.loserFee)).toString(),
    })));
    return { invites: pending };
  });

  authorizeMaker = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    const params = objectBody(request.params);
    const body = objectBody(request.body);
    const invite = await this.context.invites.authorizeMaker(
      user,
      stringField(params, 'inviteId'),
      stringField(body, 'offerSignature') as `0x${string}`,
      permitField(objectField(body, 'makerPermit')),
    );
    return {
      invite: publicInvite(invite, user),
      shareable: true,
      requiredFundingRaw: (BigInt(invite.stake) + BigInt(invite.loserFee)).toString(),
    };
  });

  cancel = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    const params = objectBody(request.params);
    const invite = await this.context.invites.cancelDraft(user, stringField(params, 'inviteId'));
    return {
      invite: publicInvite(invite, user),
    };
  });

  accept = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    const params = objectBody(request.params);
    const body = objectBody(request.body);
    const invite = await this.context.invites.accept(user, stringField(params, 'inviteId'), numberField(body, 'takerOutcomeIndex'));
    const requiredFunding = BigInt(invite.stake) + BigInt(invite.loserFee);
    const deadline = BigInt(Math.floor(invite.expiresAt.getTime() / 1000));
    return {
      invite: publicInvite(invite, user),
      acceptancePayload: invite.acceptancePayload,
      takerPermitPayload: await this.context.brl1.permitPayloadForAddress(invite.takerAddress!, requiredFunding, deadline),
      requiredFundingRaw: requiredFunding.toString(),
    };
  });

  authorizeTaker = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = request.user!;
    const params = objectBody(request.params);
    const body = objectBody(request.body);
    const invite = await this.context.invites.authorizeTaker(
      user,
      stringField(params, 'inviteId'),
      stringField(body, 'acceptanceSignature') as `0x${string}`,
      permitField(objectField(body, 'takerPermit')),
    );
    const funding = await this.context.relayer.fund({ inviteId: invite.id });
    const fundedInvite = await this.context.repository.findInvite(invite.id) ?? invite;
    return {
      invite: publicInvite(fundedInvite, user),
      funding,
    };
  });
}

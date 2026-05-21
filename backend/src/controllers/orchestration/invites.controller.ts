import type { FastifyReply, FastifyRequest } from 'fastify';
import { httpError } from '../../modules/orchestration/services.js';
import {
  bigintField,
  findTemplate,
  numberField,
  objectBody,
  optionalString,
  publicInvite,
  stringField,
  wrap,
} from './helpers.js';
import type { AuthedRequest, OrchestrationControllerContext } from './orchestration-controller.context.js';

export class InvitesController {
  constructor(private readonly context: OrchestrationControllerContext) {}

  create = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = await this.context.requireUser(request);
    const body = objectBody(request.body);
    const template = await findTemplate(this.context, stringField(body, 'templateId'), {});
    if (!template) throw httpError(404, 'TEMPLATE_NOT_FOUND');
    const stake = bigintField(body, 'stake');
    const loserFee = body.loserFee === undefined
      ? BigInt((await this.context.fees.quote(stake, template.loserFeeBps)).selectedLoserFeeRaw)
      : bigintField(body, 'loserFee');
    const invite = await this.context.invites.create(
      user,
      template,
      stake,
      loserFee,
      numberField(body, 'makerOutcomeIndex'),
      optionalString(body, 'takerAddress'),
    );
    return { invite: publicInvite(invite), offerPayload: invite.offerPayload, requiredFundingRaw: (BigInt(invite.stake) + BigInt(invite.loserFee)).toString() };
  });

  get = async (request: FastifyRequest, reply: FastifyReply) => wrap(reply, async () => {
    const params = objectBody(request.params);
    const invite = await this.context.repository.findInvite(stringField(params, 'inviteId'));
    if (!invite) throw httpError(404, 'INVITE_NOT_FOUND');
    return { invite: publicInvite(invite), offerPayload: invite.offerPayload, acceptancePayload: invite.acceptancePayload };
  });

  accept = async (request: AuthedRequest, reply: FastifyReply) => wrap(reply, async () => {
    const user = await this.context.requireUser(request);
    const params = objectBody(request.params);
    const body = objectBody(request.body);
    const invite = await this.context.invites.accept(user, stringField(params, 'inviteId'), numberField(body, 'takerOutcomeIndex'));
    return { invite: publicInvite(invite), acceptancePayload: invite.acceptancePayload, requiredFundingRaw: (BigInt(invite.stake) + BigInt(invite.loserFee)).toString() };
  });
}

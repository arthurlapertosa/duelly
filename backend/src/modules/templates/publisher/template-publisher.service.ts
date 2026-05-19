import type { CanonicalSportsTemplate, PublishableTemplatePayload } from '../domain/types.js';

export class TemplatePublisherService {
  buildPublishablePayload(template: CanonicalSportsTemplate, publishedBy = 'local-fixture-qa'): PublishableTemplatePayload {
    return {
      templateHash: template.templateHash,
      status: 'publishable',
      onChain: {
        function: 'registerTemplate',
        args: {
          templateHash: template.templateHash,
          conditionId: template.conditionId,
          marketIdHash: template.providerMarketIdHash,
          questionId: template.questionId,
          questionIdHash: template.questionIdHash,
          sport: template.sport,
          competition: template.competition,
          eventType: template.eventType,
          binaryMarketType: template.binaryMarketType,
          sportCode: template.sportCode,
          competitionCode: template.competitionCode,
          eventTypeCode: template.eventTypeCode,
          binaryMarketTypeCode: template.binaryMarketTypeCode,
          outcomeAProviderIndex: template.outcomeA.providerOutcomeIndex,
          outcomeBProviderIndex: template.outcomeB.providerOutcomeIndex,
          templateVersion: template.templateVersion,
          feePolicyVersion: template.feePolicyVersion,
          providerCode: template.providerCode,
          competitionLevelCode: template.competitionLevelCode,
          competitionDetailHash: template.competitionDetailHash,
          outcomeALabelHash: template.outcomeALabelHash,
          outcomeBLabelHash: template.outcomeBLabelHash,
          rulesSourceHash: template.rulesSourceHash,
          eventStartAt: template.eventStartAt,
          rulesHash: template.rulesHash,
          bettingCloseAt: template.bettingCloseAt,
          resolutionDeadline: template.resolutionDeadline,
          loserFeeBps: template.loserFeeBps,
          active: template.active,
        },
        calldata: null,
      },
      audit: {
        provider: template.provider,
        providerMarketId: template.providerMarketId,
        providerEventId: template.display.providerEventId,
        slug: template.display.slug,
        question: template.display.question,
        sourceUrl: template.display.sourceUrl,
        rawProviderPayloadHash: template.display.rawProviderPayloadHash,
        acceptedAt: new Date().toISOString(),
        publishedBy,
      },
    };
  }
}

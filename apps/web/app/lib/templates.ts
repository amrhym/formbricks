import { createId } from "@paralleldrive/cuid2";
import type { TFunction } from "i18next";
import { TSurveyElementTypeEnum } from "@hivecfm/types/surveys/elements";
import type { TSurveyOpenTextElement } from "@hivecfm/types/surveys/elements";
import type { TSurvey } from "@hivecfm/types/surveys/types";
import type { TTemplate } from "@hivecfm/types/templates";
import {
  buildBlock,
  buildCTAElement,
  buildConsentElement,
  buildMultipleChoiceElement,
  buildNPSElement,
  buildOpenTextElement,
  buildRatingElement,
  createBlockChoiceJumpLogic,
  createBlockJumpLogic,
} from "@/app/lib/survey-block-builder";
import { buildSurvey, getDefaultSurveyPreset, hiddenFieldsDefault } from "@/app/lib/survey-builder";
import { createI18nString } from "@/lib/i18n/utils";

const cartAbandonmentSurvey = (t: TFunction): TTemplate => {
  const reusableElementIds = [createId(), createId(), createId()];
  const block8Id = createId(); // Pre-generate ID for Block 8 (referenced by Block 6 logic)
  const localSurvey = getDefaultSurveyPreset(t);

  return buildSurvey(
    {
      name: t("templates.card_abandonment_survey"),
      role: "productManager",
      industries: ["eCommerce"],
      channels: ["app", "website", "link"],
      description: t("templates.card_abandonment_survey_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildCTAElement({
              id: reusableElementIds[0],
              subheader: t("templates.card_abandonment_survey_question_1_html"),
              headline: t("templates.card_abandonment_survey_question_1_headline"),
              required: false,
            }),
          ],
          buttonLabel: t("templates.card_abandonment_survey_question_1_button_label"),
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              headline: t("templates.card_abandonment_survey_question_2_headline"),
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              subheader: t("templates.card_abandonment_survey_question_2_subheader"),
              choices: [
                t("templates.card_abandonment_survey_question_2_choice_1"),
                t("templates.card_abandonment_survey_question_2_choice_2"),
                t("templates.card_abandonment_survey_question_2_choice_3"),
                t("templates.card_abandonment_survey_question_2_choice_4"),
                t("templates.card_abandonment_survey_question_2_choice_5"),
                t("templates.card_abandonment_survey_question_2_choice_6"),
              ],
              containsOther: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              headline: t("templates.card_abandonment_survey_question_3_headline"),
              required: false,
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildRatingElement({
              headline: t("templates.card_abandonment_survey_question_4_headline"),
              required: true,
              scale: "number",
              range: 5,
              lowerLabel: t("templates.card_abandonment_survey_question_4_lower_label"),
              upperLabel: t("templates.card_abandonment_survey_question_4_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceMulti,
              headline: t("templates.card_abandonment_survey_question_5_headline"),
              subheader: t("templates.card_abandonment_survey_question_5_subheader"),
              required: true,
              choices: [
                t("templates.card_abandonment_survey_question_5_choice_1"),
                t("templates.card_abandonment_survey_question_5_choice_2"),
                t("templates.card_abandonment_survey_question_5_choice_3"),
                t("templates.card_abandonment_survey_question_5_choice_4"),
                t("templates.card_abandonment_survey_question_5_choice_5"),
                t("templates.card_abandonment_survey_question_5_choice_6"),
              ],
              containsOther: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 6",
          elements: [
            buildConsentElement({
              id: reusableElementIds[1],
              headline: t("templates.card_abandonment_survey_question_6_headline"),
              subheader: "",
              required: false,
              label: t("templates.card_abandonment_survey_question_6_label"),
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], block8Id, "isSkipped")],
          t,
        }),
        buildBlock({
          name: "Block 7",
          elements: [
            buildOpenTextElement({
              headline: t("templates.card_abandonment_survey_question_7_headline"),
              required: true,
              inputType: "email",
              longAnswer: false,
              placeholder: "example@email.com",
            }),
          ],
          t,
        }),
        buildBlock({
          id: block8Id,
          name: "Block 8",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.card_abandonment_survey_question_8_headline"),
              required: false,
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const siteAbandonmentSurvey = (t: TFunction): TTemplate => {
  const reusableElementIds = [createId(), createId(), createId()];
  const block8Id = createId(); // Pre-generate ID for Block 8 (referenced by Block 7 logic)
  const localSurvey = getDefaultSurveyPreset(t);

  return buildSurvey(
    {
      name: t("templates.site_abandonment_survey"),
      role: "productManager",
      industries: ["eCommerce"],
      channels: ["app", "website"],
      description: t("templates.site_abandonment_survey_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildCTAElement({
              id: reusableElementIds[0],
              subheader: t("templates.site_abandonment_survey_question_1_html"),
              headline: t("templates.site_abandonment_survey_question_2_headline"),
              required: false,
            }),
          ],
          buttonLabel: t("templates.site_abandonment_survey_question_2_button_label"),
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.site_abandonment_survey_question_3_headline"),
              subheader: t("templates.site_abandonment_survey_question_3_subheader"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.site_abandonment_survey_question_3_choice_1"),
                t("templates.site_abandonment_survey_question_3_choice_2"),
                t("templates.site_abandonment_survey_question_3_choice_3"),
                t("templates.site_abandonment_survey_question_3_choice_4"),
                t("templates.site_abandonment_survey_question_3_choice_5"),
                t("templates.site_abandonment_survey_question_3_choice_6"),
              ],
              containsOther: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              headline: t("templates.site_abandonment_survey_question_4_headline"),
              required: false,
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildRatingElement({
              headline: t("templates.site_abandonment_survey_question_5_headline"),
              required: true,
              scale: "number",
              range: 5,
              lowerLabel: t("templates.site_abandonment_survey_question_5_lower_label"),
              upperLabel: t("templates.site_abandonment_survey_question_5_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceMulti,
              headline: t("templates.site_abandonment_survey_question_6_headline"),
              subheader: t("templates.site_abandonment_survey_question_6_subheader"),
              required: true,
              choices: [
                t("templates.site_abandonment_survey_question_6_choice_1"),
                t("templates.site_abandonment_survey_question_6_choice_2"),
                t("templates.site_abandonment_survey_question_6_choice_3"),
                t("templates.site_abandonment_survey_question_6_choice_4"),
                t("templates.site_abandonment_survey_question_6_choice_5"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 6",
          elements: [
            buildConsentElement({
              id: reusableElementIds[1],
              headline: t("templates.site_abandonment_survey_question_7_headline"),
              subheader: "",
              required: false,
              label: t("templates.site_abandonment_survey_question_7_label"),
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], block8Id, "isSkipped")],
          t,
        }),
        buildBlock({
          name: "Block 7",
          elements: [
            buildOpenTextElement({
              headline: t("templates.site_abandonment_survey_question_8_headline"),
              required: true,
              inputType: "email",
              longAnswer: false,
              placeholder: "example@email.com",
            }),
          ],
          t,
        }),
        buildBlock({
          id: block8Id,
          name: "Block 8",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.site_abandonment_survey_question_9_headline"),
              required: false,
              inputType: "text",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const productMarketFitSuperhuman = (t: TFunction): TTemplate => {
  const reusableElementIds = [createId()];
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.product_market_fit_superhuman"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app", "link"],
      description: t("templates.product_market_fit_superhuman_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildCTAElement({
              id: reusableElementIds[0],
              subheader: t("templates.product_market_fit_superhuman_question_1_html"),
              headline: t("templates.product_market_fit_superhuman_question_1_headline"),
              required: false,
            }),
          ],
          buttonLabel: t("templates.product_market_fit_superhuman_question_1_button_label"),
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.product_market_fit_superhuman_question_2_headline"),
              subheader: t("templates.product_market_fit_superhuman_question_2_subheader"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.product_market_fit_superhuman_question_2_choice_1"),
                t("templates.product_market_fit_superhuman_question_2_choice_2"),
                t("templates.product_market_fit_superhuman_question_2_choice_3"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.product_market_fit_superhuman_question_3_headline"),
              subheader: t("templates.product_market_fit_superhuman_question_3_subheader"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.product_market_fit_superhuman_question_3_choice_1"),
                t("templates.product_market_fit_superhuman_question_3_choice_2"),
                t("templates.product_market_fit_superhuman_question_3_choice_3"),
                t("templates.product_market_fit_superhuman_question_3_choice_4"),
                t("templates.product_market_fit_superhuman_question_3_choice_5"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              headline: t("templates.product_market_fit_superhuman_question_4_headline"),
              required: true,
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildOpenTextElement({
              headline: t("templates.product_market_fit_superhuman_question_5_headline"),
              required: true,
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 6",
          elements: [
            buildOpenTextElement({
              headline: t("templates.product_market_fit_superhuman_question_6_headline"),
              subheader: t("templates.product_market_fit_superhuman_question_6_subheader"),
              required: true,
              inputType: "text",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const onboardingSegmentation = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.onboarding_segmentation"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app", "link"],
      description: t("templates.onboarding_segmentation_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.onboarding_segmentation_question_1_headline"),
              subheader: t("templates.onboarding_segmentation_question_1_subheader"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.onboarding_segmentation_question_1_choice_1"),
                t("templates.onboarding_segmentation_question_1_choice_2"),
                t("templates.onboarding_segmentation_question_1_choice_3"),
                t("templates.onboarding_segmentation_question_1_choice_4"),
                t("templates.onboarding_segmentation_question_1_choice_5"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.onboarding_segmentation_question_2_headline"),
              subheader: t("templates.onboarding_segmentation_question_2_subheader"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.onboarding_segmentation_question_2_choice_1"),
                t("templates.onboarding_segmentation_question_2_choice_2"),
                t("templates.onboarding_segmentation_question_2_choice_3"),
                t("templates.onboarding_segmentation_question_2_choice_4"),
                t("templates.onboarding_segmentation_question_2_choice_5"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.onboarding_segmentation_question_3_headline"),
              subheader: t("templates.onboarding_segmentation_question_3_subheader"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.onboarding_segmentation_question_3_choice_1"),
                t("templates.onboarding_segmentation_question_3_choice_2"),
                t("templates.onboarding_segmentation_question_3_choice_3"),
                t("templates.onboarding_segmentation_question_3_choice_4"),
                t("templates.onboarding_segmentation_question_3_choice_5"),
              ],
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const churnSurvey = (t: TFunction): TTemplate => {
  const reusableElementIds = [createId(), createId(), createId(), createId(), createId()];
  const reusableOptionIds = [createId(), createId(), createId(), createId(), createId()];
  const block2Id = createId(); // Pre-generate IDs for blocks referenced by logic
  const block3Id = createId();
  const block4Id = createId();
  const block5Id = createId();
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.churn_survey"),
      role: "sales",
      industries: ["saas", "eCommerce", "other"],
      channels: ["app", "link"],
      description: t("templates.churn_survey_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              id: reusableElementIds[0],
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.churn_survey_question_1_choice_1"),
                t("templates.churn_survey_question_1_choice_2"),
                t("templates.churn_survey_question_1_choice_3"),
                t("templates.churn_survey_question_1_choice_4"),
                t("templates.churn_survey_question_1_choice_5"),
              ],
              choiceIds: [
                reusableOptionIds[0],
                reusableOptionIds[1],
                reusableOptionIds[2],
                reusableOptionIds[3],
                reusableOptionIds[4],
              ],
              headline: t("templates.churn_survey_question_1_headline"),
              required: true,
              subheader: t("templates.churn_survey_question_1_subheader"),
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[0], block2Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[1], block3Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[2], block4Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[3], block5Id),
            createBlockChoiceJumpLogic(
              reusableElementIds[0],
              reusableOptionIds[4],
              localSurvey.endings[0].id
            ),
          ],
          t,
        }),
        buildBlock({
          id: block2Id,
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.churn_survey_question_2_headline"),
              required: true,
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], localSurvey.endings[0].id, "isSubmitted")],
          buttonLabel: t("templates.churn_survey_question_2_button_label"),
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildCTAElement({
              id: reusableElementIds[2],
              subheader: t("templates.churn_survey_question_3_html"),
              headline: t("templates.churn_survey_question_3_headline"),
              required: false,
              buttonUrl: "https://formbricks.com",
              buttonExternal: true,
              ctaButtonLabel: t("templates.churn_survey_question_3_button_label"),
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[2], localSurvey.endings[0].id, "isClicked")],
          t,
        }),
        buildBlock({
          id: block4Id,
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[3],
              headline: t("templates.churn_survey_question_4_headline"),
              required: true,
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[3], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block5Id,
          name: "Block 5",
          elements: [
            buildCTAElement({
              id: reusableElementIds[4],
              subheader: t("templates.churn_survey_question_5_html"),
              headline: t("templates.churn_survey_question_5_headline"),
              required: false,
              buttonUrl: "mailto:ceo@company.com",
              buttonExternal: true,
              ctaButtonLabel: t("templates.churn_survey_question_5_button_label"),
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[4], localSurvey.endings[0].id, "isClicked")],
          t,
        }),
      ],
    },
    t
  );
};

const earnedAdvocacyScore = (t: TFunction): TTemplate => {
  const reusableElementIds = [createId(), createId(), createId(), createId()];
  const reusableOptionIds = [createId(), createId(), createId(), createId()];
  const block3Id = createId(); // Pre-generate ID for Block 3 (referenced by Block 1 logic)
  const block4Id = createId();
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.earned_advocacy_score_name"),
      role: "customerSuccess",
      industries: ["saas", "eCommerce", "other"],
      channels: ["app", "link"],
      description: t("templates.earned_advocacy_score_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              id: reusableElementIds[0],
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.earned_advocacy_score_question_1_choice_1"),
                t("templates.earned_advocacy_score_question_1_choice_2"),
              ],
              choiceIds: [reusableOptionIds[0], reusableOptionIds[1]],
              headline: t("templates.earned_advocacy_score_question_1_headline"),
              required: true,
            }),
          ],
          logic: [createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[1], block3Id)],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.earned_advocacy_score_question_2_headline"),
              required: true,
              placeholder: t("templates.earned_advocacy_score_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], block4Id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.earned_advocacy_score_question_3_headline"),
              required: true,
              placeholder: t("templates.earned_advocacy_score_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          id: block4Id,
          name: "Block 4",
          elements: [
            buildMultipleChoiceElement({
              id: reusableElementIds[3],
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.earned_advocacy_score_question_4_choice_1"),
                t("templates.earned_advocacy_score_question_4_choice_2"),
              ],
              choiceIds: [reusableOptionIds[2], reusableOptionIds[3]],
              headline: t("templates.earned_advocacy_score_question_4_headline"),
              required: true,
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(
              reusableElementIds[3],
              reusableOptionIds[3],
              localSurvey.endings[0].id
            ),
          ],
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildOpenTextElement({
              headline: t("templates.earned_advocacy_score_question_5_headline"),
              required: true,
              placeholder: t("templates.earned_advocacy_score_question_5_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const usabilityScoreRatingSurvey = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.usability_score_name"),
      role: "customerSuccess",
      industries: ["saas"],
      channels: ["app", "link"],
      description: t("templates.usability_rating_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.usability_question_1_headline"),
              required: true,
              lowerLabel: t("templates.strongly_disagree"),
              upperLabel: t("templates.strongly_agree"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.usability_question_2_headline"),
              required: true,
              lowerLabel: t("templates.strongly_disagree"),
              upperLabel: t("templates.strongly_agree"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.usability_question_3_headline"),
              required: true,
              lowerLabel: t("templates.strongly_disagree"),
              upperLabel: t("templates.strongly_agree"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.usability_question_4_headline"),
              required: true,
              lowerLabel: t("templates.strongly_disagree"),
              upperLabel: t("templates.strongly_agree"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.usability_question_5_headline"),
              required: true,
              lowerLabel: t("templates.strongly_disagree"),
              upperLabel: t("templates.strongly_agree"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 6",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.usability_question_6_headline"),
              required: true,
              lowerLabel: t("templates.strongly_disagree"),
              upperLabel: t("templates.strongly_agree"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 7",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.usability_question_7_headline"),
              required: true,
              lowerLabel: t("templates.strongly_disagree"),
              upperLabel: t("templates.strongly_agree"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 8",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.usability_question_8_headline"),
              required: true,
              lowerLabel: t("templates.strongly_disagree"),
              upperLabel: t("templates.strongly_agree"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 9",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.usability_question_9_headline"),
              required: true,
              lowerLabel: t("templates.strongly_disagree"),
              upperLabel: t("templates.strongly_agree"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 10",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.usability_question_10_headline"),
              required: true,
              lowerLabel: t("templates.strongly_disagree"),
              upperLabel: t("templates.strongly_agree"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const improveTrialConversion = (t: TFunction): TTemplate => {
  const reusableElementIds = [createId(), createId(), createId(), createId(), createId(), createId()];
  const reusableOptionIds = [
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
  ];
  const block2Id = createId(); // Pre-generate IDs for blocks referenced by logic
  const block3Id = createId();
  const block4Id = createId();
  const block5Id = createId();
  const block6Id = createId(); // Block 6 referenced by blocks 2, 3, and 5
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.improve_trial_conversion_name"),
      role: "sales",
      industries: ["saas"],
      channels: ["link", "app"],
      description: t("templates.improve_trial_conversion_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              id: reusableElementIds[0],
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.improve_trial_conversion_question_1_choice_1"),
                t("templates.improve_trial_conversion_question_1_choice_2"),
                t("templates.improve_trial_conversion_question_1_choice_3"),
                t("templates.improve_trial_conversion_question_1_choice_4"),
                t("templates.improve_trial_conversion_question_1_choice_5"),
              ],
              choiceIds: [
                reusableOptionIds[0],
                reusableOptionIds[1],
                reusableOptionIds[2],
                reusableOptionIds[3],
                reusableOptionIds[4],
              ],
              headline: t("templates.improve_trial_conversion_question_1_headline"),
              required: true,
              subheader: t("templates.improve_trial_conversion_question_1_subheader"),
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[0], block2Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[1], block3Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[2], block4Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[3], block5Id),
            createBlockChoiceJumpLogic(
              reusableElementIds[0],
              reusableOptionIds[4],
              localSurvey.endings[0].id
            ),
          ],
          t,
        }),
        buildBlock({
          id: block2Id,
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.improve_trial_conversion_question_2_headline"),
              required: true,
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], block6Id, "isSubmitted")],
          buttonLabel: t("templates.improve_trial_conversion_question_2_button_label"),
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.improve_trial_conversion_question_2_headline"),
              required: true,
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[2], block6Id, "isSubmitted")],
          buttonLabel: t("templates.improve_trial_conversion_question_2_button_label"),
          t,
        }),
        buildBlock({
          id: block4Id,
          name: "Block 4",
          elements: [
            buildCTAElement({
              id: reusableElementIds[3],
              subheader: t("templates.improve_trial_conversion_question_4_html"),
              headline: t("templates.improve_trial_conversion_question_4_headline"),
              required: false,
              buttonUrl: "https://formbricks.com/github",
              buttonExternal: true,
              ctaButtonLabel: t("templates.improve_trial_conversion_question_4_button_label"),
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[3], localSurvey.endings[0].id, "isClicked")],
          t,
        }),
        buildBlock({
          id: block5Id,
          name: "Block 5",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[4],
              headline: t("templates.improve_trial_conversion_question_5_headline"),
              required: true,
              subheader: t("templates.improve_trial_conversion_question_5_subheader"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[4], block6Id, "isSubmitted")],
          buttonLabel: t("templates.improve_trial_conversion_question_5_button_label"),
          t,
        }),
        buildBlock({
          id: block6Id,
          name: "Block 6",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[5],
              headline: t("templates.improve_trial_conversion_question_6_headline"),
              required: false,
              subheader: t("templates.improve_trial_conversion_question_6_subheader"),
              inputType: "text",
            }),
          ],
          logic: [
            createBlockJumpLogic(reusableElementIds[5], localSurvey.endings[0].id, "isSubmitted"),
            createBlockJumpLogic(reusableElementIds[5], localSurvey.endings[0].id, "isSkipped"),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const reviewPrompt = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  const reusableElementIds = [createId(), createId(), createId()];
  const block3Id = createId(); // Pre-generate ID for Block 3 (referenced by Block 1 logic)

  return buildSurvey(
    {
      name: t("templates.review_prompt_name"),
      role: "marketing",
      industries: ["saas", "eCommerce", "other"],
      channels: ["link", "app"],
      description: t("templates.review_prompt_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              id: reusableElementIds[0],
              range: 5,
              scale: "star",
              headline: t("templates.review_prompt_question_1_headline"),
              required: true,
              lowerLabel: t("templates.review_prompt_question_1_lower_label"),
              upperLabel: t("templates.review_prompt_question_1_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "and",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[0],
                      type: "element",
                    },
                    operator: "isLessThanOrEqual",
                    rightOperand: {
                      type: "static",
                      value: 3,
                    },
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: block3Id,
                },
              ],
            },
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildCTAElement({
              id: reusableElementIds[1],
              subheader: t("templates.review_prompt_question_2_html"),
              headline: t("templates.review_prompt_question_2_headline"),
              required: false,
              buttonUrl: "https://formbricks.com/github",
              buttonExternal: true,
              ctaButtonLabel: t("templates.review_prompt_question_2_button_label"),
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], localSurvey.endings[0].id, "isClicked")],
          buttonLabel: t("templates.next"),
          backButtonLabel: t("templates.back"),
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.review_prompt_question_3_headline"),
              required: true,
              subheader: t("templates.review_prompt_question_3_subheader"),
              placeholder: t("templates.review_prompt_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.review_prompt_question_3_button_label"),
          t,
        }),
      ],
    },
    t
  );
};

const interviewPrompt = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.interview_prompt_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app"],
      description: t("templates.interview_prompt_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildCTAElement({
              headline: t("templates.interview_prompt_question_1_headline"),
              subheader: t("templates.interview_prompt_question_1_html"),
              buttonUrl: "https://cal.com/johannes",
              buttonExternal: true,
              required: false,
              ctaButtonLabel: t("templates.interview_prompt_question_1_button_label"),
            }),
          ],
          buttonLabel: t("templates.next"),
          t,
        }),
      ],
    },
    t
  );
};

const improveActivationRate = (t: TFunction): TTemplate => {
  const reusableElementIds = [createId(), createId(), createId(), createId(), createId(), createId()];
  const reusableOptionIds = [createId(), createId(), createId(), createId(), createId()];
  const block3Id = createId(); // Pre-generate IDs for blocks referenced by logic
  const block4Id = createId();
  const block5Id = createId();
  const block6Id = createId();
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.improve_activation_rate_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["link"],
      description: t("templates.improve_activation_rate_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              id: reusableElementIds[0],
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.improve_activation_rate_question_1_choice_1"),
                t("templates.improve_activation_rate_question_1_choice_2"),
                t("templates.improve_activation_rate_question_1_choice_3"),
                t("templates.improve_activation_rate_question_1_choice_4"),
                t("templates.improve_activation_rate_question_1_choice_5"),
              ],
              choiceIds: [
                reusableOptionIds[0],
                reusableOptionIds[1],
                reusableOptionIds[2],
                reusableOptionIds[3],
                reusableOptionIds[4],
              ],
              headline: t("templates.improve_activation_rate_question_1_headline"),
              required: true,
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[1], block3Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[2], block4Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[3], block5Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[4], block6Id),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.improve_activation_rate_question_2_headline"),
              required: true,
              placeholder: t("templates.improve_activation_rate_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.improve_activation_rate_question_3_headline"),
              required: true,
              placeholder: t("templates.improve_activation_rate_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[2], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block4Id,
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[3],
              headline: t("templates.improve_activation_rate_question_4_headline"),
              required: true,
              placeholder: t("templates.improve_activation_rate_question_4_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[3], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block5Id,
          name: "Block 5",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[4],
              headline: t("templates.improve_activation_rate_question_5_headline"),
              required: true,
              placeholder: t("templates.improve_activation_rate_question_5_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[4], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block6Id,
          name: "Block 6",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[5],
              headline: t("templates.improve_activation_rate_question_6_headline"),
              required: false,
              subheader: t("templates.improve_activation_rate_question_6_subheader"),
              placeholder: t("templates.improve_activation_rate_question_6_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const employeeSatisfaction = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.employee_satisfaction_name"),
      role: "peopleManager",
      industries: ["saas", "eCommerce", "other"],
      channels: ["app", "link"],
      description: t("templates.employee_satisfaction_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "star",
              headline: t("templates.employee_satisfaction_question_1_headline"),
              required: true,
              lowerLabel: t("templates.employee_satisfaction_question_1_lower_label"),
              upperLabel: t("templates.employee_satisfaction_question_1_upper_label"),
              isColorCodingEnabled: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.employee_satisfaction_question_2_choice_1"),
                t("templates.employee_satisfaction_question_2_choice_2"),
                t("templates.employee_satisfaction_question_2_choice_3"),
                t("templates.employee_satisfaction_question_2_choice_4"),
                t("templates.employee_satisfaction_question_2_choice_5"),
              ],
              headline: t("templates.employee_satisfaction_question_2_headline"),
              required: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              headline: t("templates.employee_satisfaction_question_3_headline"),
              required: false,
              placeholder: t("templates.employee_satisfaction_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.employee_satisfaction_question_5_headline"),
              required: true,
              lowerLabel: t("templates.employee_satisfaction_question_5_lower_label"),
              upperLabel: t("templates.employee_satisfaction_question_5_upper_label"),
              isColorCodingEnabled: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildOpenTextElement({
              headline: t("templates.employee_satisfaction_question_6_headline"),
              required: false,
              placeholder: t("templates.employee_satisfaction_question_6_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 6",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.employee_satisfaction_question_7_choice_1"),
                t("templates.employee_satisfaction_question_7_choice_2"),
                t("templates.employee_satisfaction_question_7_choice_3"),
                t("templates.employee_satisfaction_question_7_choice_4"),
                t("templates.employee_satisfaction_question_7_choice_5"),
              ],
              headline: t("templates.employee_satisfaction_question_7_headline"),
              required: true,
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const uncoverStrengthsAndWeaknesses = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.uncover_strengths_and_weaknesses_name"),
      role: "productManager",
      industries: ["saas", "other"],
      channels: ["app", "link"],
      description: t("templates.uncover_strengths_and_weaknesses_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.uncover_strengths_and_weaknesses_question_1_choice_1"),
                t("templates.uncover_strengths_and_weaknesses_question_1_choice_2"),
                t("templates.uncover_strengths_and_weaknesses_question_1_choice_3"),
                t("templates.uncover_strengths_and_weaknesses_question_1_choice_4"),
                t("templates.uncover_strengths_and_weaknesses_question_1_choice_5"),
              ],
              headline: t("templates.uncover_strengths_and_weaknesses_question_1_headline"),
              required: true,
              containsOther: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.uncover_strengths_and_weaknesses_question_2_choice_1"),
                t("templates.uncover_strengths_and_weaknesses_question_2_choice_2"),
                t("templates.uncover_strengths_and_weaknesses_question_2_choice_3"),
                t("templates.uncover_strengths_and_weaknesses_question_2_choice_4"),
              ],
              headline: t("templates.uncover_strengths_and_weaknesses_question_2_headline"),
              required: true,
              subheader: t("templates.uncover_strengths_and_weaknesses_question_2_subheader"),
              containsOther: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              headline: t("templates.uncover_strengths_and_weaknesses_question_3_headline"),
              required: false,
              subheader: t("templates.uncover_strengths_and_weaknesses_question_3_subheader"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const productMarketFitShort = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.product_market_fit_short_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app", "link"],
      description: t("templates.product_market_fit_short_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.product_market_fit_short_question_1_headline"),
              subheader: t("templates.product_market_fit_short_question_1_subheader"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.product_market_fit_short_question_1_choice_1"),
                t("templates.product_market_fit_short_question_1_choice_2"),
                t("templates.product_market_fit_short_question_1_choice_3"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              headline: t("templates.product_market_fit_short_question_2_headline"),
              subheader: t("templates.product_market_fit_short_question_2_subheader"),
              required: true,
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const marketAttribution = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.market_attribution_name"),
      role: "marketing",
      industries: ["saas", "eCommerce"],
      channels: ["website", "app", "link"],
      description: t("templates.market_attribution_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.market_attribution_question_1_headline"),
              subheader: t("templates.market_attribution_question_1_subheader"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.market_attribution_question_1_choice_1"),
                t("templates.market_attribution_question_1_choice_2"),
                t("templates.market_attribution_question_1_choice_3"),
                t("templates.market_attribution_question_1_choice_4"),
                t("templates.market_attribution_question_1_choice_5"),
              ],
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const changingSubscriptionExperience = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.changing_subscription_experience_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app"],
      description: t("templates.changing_subscription_experience_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.changing_subscription_experience_question_1_headline"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.changing_subscription_experience_question_1_choice_1"),
                t("templates.changing_subscription_experience_question_1_choice_2"),
                t("templates.changing_subscription_experience_question_1_choice_3"),
                t("templates.changing_subscription_experience_question_1_choice_4"),
                t("templates.changing_subscription_experience_question_1_choice_5"),
              ],
            }),
          ],
          buttonLabel: t("templates.next"),
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.changing_subscription_experience_question_2_headline"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.changing_subscription_experience_question_2_choice_1"),
                t("templates.changing_subscription_experience_question_2_choice_2"),
                t("templates.changing_subscription_experience_question_2_choice_3"),
              ],
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const identifyCustomerGoals = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.identify_customer_goals_name"),
      role: "productManager",
      industries: ["saas", "other"],
      channels: ["app", "website"],
      description: t("templates.identify_customer_goals_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: "What's your primary goal for using $[projectName]?",
              required: true,
              shuffleOption: "none",
              choices: [
                "Understand my user base deeply",
                "Identify upselling opportunities",
                "Build the best possible product",
                "Rule the world to make everyone breakfast brussels sprouts.",
              ],
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const featureChaser = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.feature_chaser_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app"],
      description: t("templates.feature_chaser_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.feature_chaser_question_1_headline"),
              required: true,
              lowerLabel: t("templates.feature_chaser_question_1_lower_label"),
              upperLabel: t("templates.feature_chaser_question_1_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.feature_chaser_question_2_choice_1"),
                t("templates.feature_chaser_question_2_choice_2"),
                t("templates.feature_chaser_question_2_choice_3"),
                t("templates.feature_chaser_question_2_choice_4"),
              ],
              headline: t("templates.feature_chaser_question_2_headline"),
              required: true,
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const fakeDoorFollowUp = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.fake_door_follow_up_name"),
      role: "productManager",
      industries: ["saas", "eCommerce"],
      channels: ["app", "website"],
      description: t("templates.fake_door_follow_up_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: t("templates.fake_door_follow_up_question_1_headline"),
              required: true,
              lowerLabel: t("templates.fake_door_follow_up_question_1_lower_label"),
              upperLabel: t("templates.fake_door_follow_up_question_1_upper_label"),
              range: 5,
              scale: "number",
              isColorCodingEnabled: false,
            }),
          ],
          buttonLabel: t("templates.next"),
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceMulti,
              headline: t("templates.fake_door_follow_up_question_2_headline"),
              required: false,
              shuffleOption: "none",
              choices: [
                t("templates.fake_door_follow_up_question_2_choice_1"),
                t("templates.fake_door_follow_up_question_2_choice_2"),
                t("templates.fake_door_follow_up_question_2_choice_3"),
                t("templates.fake_door_follow_up_question_2_choice_4"),
              ],
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const feedbackBox = (t: TFunction): TTemplate => {
  const reusableElementIds = [createId(), createId(), createId(), createId()];
  const reusableOptionIds = [createId(), createId()];
  const block2Id = createId(); // Pre-generate IDs for blocks referenced by logic
  const block3Id = createId(); // Block 3 referenced by block 2
  const block4Id = createId();
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.feedback_box_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app"],
      description: t("templates.feedback_box_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              id: reusableElementIds[0],
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.feedback_box_question_1_choice_1"),
                t("templates.feedback_box_question_1_choice_2"),
              ],
              choiceIds: [reusableOptionIds[0], reusableOptionIds[1]],
              headline: t("templates.feedback_box_question_1_headline"),
              required: true,
              subheader: t("templates.feedback_box_question_1_subheader"),
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[0], block2Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[1], block4Id),
          ],
          buttonLabel: t("templates.next"),
          t,
        }),
        buildBlock({
          id: block2Id,
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.feedback_box_question_2_headline"),
              required: true,
              subheader: t("templates.feedback_box_question_2_subheader"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], block3Id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildCTAElement({
              id: reusableElementIds[2],
              subheader: t("templates.feedback_box_question_3_html"),
              headline: t("templates.feedback_box_question_3_headline"),
              required: false,
            }),
          ],
          buttonLabel: t("templates.feedback_box_question_3_button_label"),
          t,
        }),
        buildBlock({
          id: block4Id,
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[3],
              headline: t("templates.feedback_box_question_4_headline"),
              required: true,
              subheader: t("templates.feedback_box_question_4_subheader"),
              placeholder: t("templates.feedback_box_question_4_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.feedback_box_question_4_button_label"),
          t,
        }),
      ],
    },
    t
  );
};

const integrationSetupSurvey = (t: TFunction): TTemplate => {
  const reusableElementIds = [createId(), createId(), createId()];
  const block3Id = createId(); // Pre-generate ID for Block 3 (referenced by Block 1 logic)
  const localSurvey = getDefaultSurveyPreset(t);

  return buildSurvey(
    {
      name: t("templates.integration_setup_survey_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app"],
      description: t("templates.integration_setup_survey_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              id: reusableElementIds[0],
              range: 5,
              scale: "number",
              headline: t("templates.integration_setup_survey_question_1_headline"),
              required: true,
              lowerLabel: t("templates.integration_setup_survey_question_1_lower_label"),
              upperLabel: t("templates.integration_setup_survey_question_1_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "and",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[0],
                      type: "element",
                    },
                    operator: "isGreaterThanOrEqual",
                    rightOperand: {
                      type: "static",
                      value: 4,
                    },
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: block3Id,
                },
              ],
            },
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.integration_setup_survey_question_2_headline"),
              required: false,
              placeholder: t("templates.integration_setup_survey_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.integration_setup_survey_question_3_headline"),
              required: false,
              subheader: t("templates.integration_setup_survey_question_3_subheader"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const newIntegrationSurvey = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.new_integration_survey_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app"],
      description: t("templates.new_integration_survey_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.new_integration_survey_question_1_headline"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.new_integration_survey_question_1_choice_1"),
                t("templates.new_integration_survey_question_1_choice_2"),
                t("templates.new_integration_survey_question_1_choice_3"),
                t("templates.new_integration_survey_question_1_choice_4"),
                t("templates.new_integration_survey_question_1_choice_5"),
              ],
              containsOther: true,
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const docsFeedback = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.docs_feedback_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app", "website", "link"],
      description: t("templates.docs_feedback_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.docs_feedback_question_1_headline"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.docs_feedback_question_1_choice_1"),
                t("templates.docs_feedback_question_1_choice_2"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              headline: t("templates.docs_feedback_question_2_headline"),
              required: false,
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              headline: t("templates.docs_feedback_question_3_headline"),
              required: false,
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const nps = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.nps_name"),
      role: "customerSuccess",
      industries: ["saas", "eCommerce", "other"],
      channels: ["app", "link", "website"],
      description: t("templates.nps_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildNPSElement({
              headline: t("templates.nps_question_1_headline"),
              required: false,
              lowerLabel: t("templates.nps_question_1_lower_label"),
              upperLabel: t("templates.nps_question_1_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              headline: t("templates.nps_question_2_headline"),
              required: false,
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const customerSatisfactionScore = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.csat_name"),
      role: "customerSuccess",
      industries: ["saas", "eCommerce", "other"],
      channels: ["app", "link", "website"],
      description: t("templates.csat_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              range: 10,
              scale: "number",
              headline: t("templates.csat_question_1_headline"),
              required: true,
              lowerLabel: t("templates.csat_question_1_lower_label"),
              upperLabel: t("templates.csat_question_1_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.csat_question_2_headline"),
              subheader: t("templates.csat_question_2_subheader"),
              required: true,
              choices: [
                t("templates.csat_question_2_choice_1"),
                t("templates.csat_question_2_choice_2"),
                t("templates.csat_question_2_choice_3"),
                t("templates.csat_question_2_choice_4"),
                t("templates.csat_question_2_choice_5"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceMulti,
              headline: t("templates.csat_question_3_headline"),
              subheader: t("templates.csat_question_3_subheader"),
              required: true,
              choices: [
                t("templates.csat_question_3_choice_1"),
                t("templates.csat_question_3_choice_2"),
                t("templates.csat_question_3_choice_3"),
                t("templates.csat_question_3_choice_4"),
                t("templates.csat_question_3_choice_5"),
                t("templates.csat_question_3_choice_6"),
                t("templates.csat_question_3_choice_7"),
                t("templates.csat_question_3_choice_8"),
                t("templates.csat_question_3_choice_9"),
                t("templates.csat_question_3_choice_10"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.csat_question_4_headline"),
              subheader: t("templates.csat_question_4_subheader"),
              required: true,
              choices: [
                t("templates.csat_question_4_choice_1"),
                t("templates.csat_question_4_choice_2"),
                t("templates.csat_question_4_choice_3"),
                t("templates.csat_question_4_choice_4"),
                t("templates.csat_question_4_choice_5"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.csat_question_5_headline"),
              subheader: t("templates.csat_question_5_subheader"),
              required: true,
              choices: [
                t("templates.csat_question_5_choice_1"),
                t("templates.csat_question_5_choice_2"),
                t("templates.csat_question_5_choice_3"),
                t("templates.csat_question_5_choice_4"),
                t("templates.csat_question_5_choice_5"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 6",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.csat_question_6_headline"),
              subheader: t("templates.csat_question_6_subheader"),
              required: true,
              choices: [
                t("templates.csat_question_6_choice_1"),
                t("templates.csat_question_6_choice_2"),
                t("templates.csat_question_6_choice_3"),
                t("templates.csat_question_6_choice_4"),
                t("templates.csat_question_6_choice_5"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 7",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.csat_question_7_headline"),
              subheader: t("templates.csat_question_7_subheader"),
              required: true,
              choices: [
                t("templates.csat_question_7_choice_1"),
                t("templates.csat_question_7_choice_2"),
                t("templates.csat_question_7_choice_3"),
                t("templates.csat_question_7_choice_4"),
                t("templates.csat_question_7_choice_5"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 8",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.csat_question_8_headline"),
              subheader: t("templates.csat_question_8_subheader"),
              required: true,
              choices: [
                t("templates.csat_question_8_choice_1"),
                t("templates.csat_question_8_choice_2"),
                t("templates.csat_question_8_choice_3"),
                t("templates.csat_question_8_choice_4"),
                t("templates.csat_question_8_choice_5"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 9",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.csat_question_9_headline"),
              subheader: t("templates.csat_question_9_subheader"),
              required: true,
              choices: [
                t("templates.csat_question_9_choice_1"),
                t("templates.csat_question_9_choice_2"),
                t("templates.csat_question_9_choice_3"),
                t("templates.csat_question_9_choice_4"),
                t("templates.csat_question_9_choice_5"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 10",
          elements: [
            buildOpenTextElement({
              headline: t("templates.csat_question_10_headline"),
              required: false,
              placeholder: t("templates.csat_question_10_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const collectFeedback = (t: TFunction): TTemplate => {
  const reusableElementIds = [
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
  ];
  const block3Id = createId(); // Pre-generate IDs for blocks referenced by logic
  const block4Id = createId();
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.collect_feedback_name"),
      role: "productManager",
      industries: ["other", "eCommerce"],
      channels: ["website", "link"],
      description: t("templates.collect_feedback_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              id: reusableElementIds[0],
              range: 5,
              scale: "star",
              headline: t("templates.collect_feedback_question_1_headline"),
              subheader: t("templates.collect_feedback_question_1_subheader"),
              required: true,
              lowerLabel: t("templates.collect_feedback_question_1_lower_label"),
              upperLabel: t("templates.collect_feedback_question_1_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "and",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[0],
                      type: "element",
                    },
                    operator: "isLessThanOrEqual",
                    rightOperand: {
                      type: "static",
                      value: 3,
                    },
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: block3Id,
                },
              ],
            },
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.collect_feedback_question_2_headline"),
              required: true,
              longAnswer: true,
              placeholder: t("templates.collect_feedback_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "and",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[1],
                      type: "element",
                    },
                    operator: "isSubmitted",
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: block4Id,
                },
              ],
            },
          ],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.collect_feedback_question_3_headline"),
              required: true,
              longAnswer: true,
              placeholder: t("templates.collect_feedback_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          id: block4Id,
          name: "Block 4",
          elements: [
            buildRatingElement({
              id: reusableElementIds[3],
              range: 5,
              scale: "smiley",
              headline: t("templates.collect_feedback_question_4_headline"),
              required: true,
              lowerLabel: t("templates.collect_feedback_question_4_lower_label"),
              upperLabel: t("templates.collect_feedback_question_4_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[4],
              headline: t("templates.collect_feedback_question_5_headline"),
              required: false,
              longAnswer: true,
              placeholder: t("templates.collect_feedback_question_5_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 6",
          elements: [
            buildMultipleChoiceElement({
              id: reusableElementIds[5],
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              choices: [
                t("templates.collect_feedback_question_6_choice_1"),
                t("templates.collect_feedback_question_6_choice_2"),
                t("templates.collect_feedback_question_6_choice_3"),
                t("templates.collect_feedback_question_6_choice_4"),
                t("templates.collect_feedback_question_6_choice_5"),
              ],
              headline: t("templates.collect_feedback_question_6_headline"),
              required: true,
              shuffleOption: "none",
              containsOther: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 7",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[6],
              headline: t("templates.collect_feedback_question_7_headline"),
              required: false,
              inputType: "email",
              longAnswer: false,
              placeholder: t("templates.collect_feedback_question_7_placeholder"),
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const identifyUpsellOpportunities = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.identify_upsell_opportunities_name"),
      role: "sales",
      industries: ["saas"],
      channels: ["app", "link"],
      description: t("templates.identify_upsell_opportunities_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.identify_upsell_opportunities_question_1_headline"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.identify_upsell_opportunities_question_1_choice_1"),
                t("templates.identify_upsell_opportunities_question_1_choice_2"),
                t("templates.identify_upsell_opportunities_question_1_choice_3"),
                t("templates.identify_upsell_opportunities_question_1_choice_4"),
              ],
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const prioritizeFeatures = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.prioritize_features_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app"],
      description: t("templates.prioritize_features_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.prioritize_features_question_1_choice_1"),
                t("templates.prioritize_features_question_1_choice_2"),
                t("templates.prioritize_features_question_1_choice_3"),
                t("templates.prioritize_features_question_1_choice_4"),
              ],
              headline: t("templates.prioritize_features_question_1_headline"),
              required: true,
              containsOther: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.prioritize_features_question_2_choice_1"),
                t("templates.prioritize_features_question_2_choice_2"),
                t("templates.prioritize_features_question_2_choice_3"),
              ],
              headline: t("templates.prioritize_features_question_2_headline"),
              required: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              headline: t("templates.prioritize_features_question_3_headline"),
              required: true,
              placeholder: t("templates.prioritize_features_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const gaugeFeatureSatisfaction = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.gauge_feature_satisfaction_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app"],
      description: t("templates.gauge_feature_satisfaction_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: t("templates.gauge_feature_satisfaction_question_1_headline"),
              required: true,
              lowerLabel: t("templates.gauge_feature_satisfaction_question_1_lower_label"),
              upperLabel: t("templates.gauge_feature_satisfaction_question_1_upper_label"),
              scale: "number",
              range: 5,
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              headline: t("templates.gauge_feature_satisfaction_question_2_headline"),
              required: false,
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const marketSiteClarity = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.market_site_clarity_name"),
      role: "marketing",
      industries: ["saas", "eCommerce", "other"],
      channels: ["website"],
      description: t("templates.market_site_clarity_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.market_site_clarity_question_1_headline"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.market_site_clarity_question_1_choice_1"),
                t("templates.market_site_clarity_question_1_choice_2"),
                t("templates.market_site_clarity_question_1_choice_3"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              headline: t("templates.market_site_clarity_question_2_headline"),
              required: false,
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildCTAElement({
              headline: t("templates.market_site_clarity_question_3_headline"),
              subheader: "",
              required: false,
              buttonUrl: "#/auth/signup",
              buttonExternal: true,
              ctaButtonLabel: t("templates.market_site_clarity_question_3_button_label"),
            }),
          ],
          buttonLabel: t("templates.next"),
          t,
        }),
      ],
    },
    t
  );
};

const customerEffortScore = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.customer_effort_score_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app"],
      description: t("templates.customer_effort_score_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.customer_effort_score_question_1_headline"),
              required: true,
              lowerLabel: t("templates.customer_effort_score_question_1_lower_label"),
              upperLabel: t("templates.customer_effort_score_question_1_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              headline: t("templates.customer_effort_score_question_2_headline"),
              required: true,
              placeholder: t("templates.customer_effort_score_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const careerDevelopmentSurvey = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.career_development_survey_name"),
      role: "peopleManager",
      industries: ["saas", "eCommerce", "other"],
      channels: ["link"],
      description: t("templates.career_development_survey_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.career_development_survey_question_1_headline"),
              lowerLabel: t("templates.career_development_survey_question_1_lower_label"),
              upperLabel: t("templates.career_development_survey_question_1_upper_label"),
              required: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.career_development_survey_question_2_headline"),
              lowerLabel: t("templates.career_development_survey_question_2_lower_label"),
              upperLabel: t("templates.career_development_survey_question_2_upper_label"),
              required: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.career_development_survey_question_3_headline"),
              lowerLabel: t("templates.career_development_survey_question_3_lower_label"),
              upperLabel: t("templates.career_development_survey_question_3_upper_label"),
              required: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.career_development_survey_question_4_headline"),
              lowerLabel: t("templates.career_development_survey_question_4_lower_label"),
              upperLabel: t("templates.career_development_survey_question_4_upper_label"),
              required: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.career_development_survey_question_5_headline"),
              subheader: t("templates.career_development_survey_question_5_subheader"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.career_development_survey_question_5_choice_1"),
                t("templates.career_development_survey_question_5_choice_2"),
                t("templates.career_development_survey_question_5_choice_3"),
                t("templates.career_development_survey_question_5_choice_4"),
                t("templates.career_development_survey_question_5_choice_5"),
                t("templates.career_development_survey_question_5_choice_6"),
              ],
              containsOther: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 6",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.career_development_survey_question_6_headline"),
              subheader: t("templates.career_development_survey_question_6_subheader"),
              required: true,
              shuffleOption: "exceptLast",
              choices: [
                t("templates.career_development_survey_question_6_choice_1"),
                t("templates.career_development_survey_question_6_choice_2"),
                t("templates.career_development_survey_question_6_choice_3"),
                t("templates.career_development_survey_question_6_choice_4"),
                t("templates.career_development_survey_question_6_choice_5"),
                t("templates.career_development_survey_question_6_choice_6"),
              ],
              containsOther: true,
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const professionalDevelopmentSurvey = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.professional_development_survey_name"),
      role: "peopleManager",
      industries: ["saas", "eCommerce", "other"],
      channels: ["link"],
      description: t("templates.professional_development_survey_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.professional_development_survey_question_1_headline"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.professional_development_survey_question_1_choice_1"),
                t("templates.professional_development_survey_question_1_choice_2"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceMulti,
              headline: t("templates.professional_development_survey_question_2_headline"),
              subheader: t("templates.professional_development_survey_question_2_subheader"),
              required: true,
              shuffleOption: "exceptLast",
              choices: [
                t("templates.professional_development_survey_question_2_choice_1"),
                t("templates.professional_development_survey_question_2_choice_2"),
                t("templates.professional_development_survey_question_2_choice_3"),
                t("templates.professional_development_survey_question_2_choice_4"),
                t("templates.professional_development_survey_question_2_choice_5"),
                t("templates.professional_development_survey_question_2_choice_6"),
              ],
              containsOther: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              headline: t("templates.professional_development_survey_question_3_headline"),
              required: true,
              shuffleOption: "none",
              choices: [
                t("templates.professional_development_survey_question_3_choice_1"),
                t("templates.professional_development_survey_question_3_choice_2"),
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.professional_development_survey_question_4_headline"),
              lowerLabel: t("templates.professional_development_survey_question_4_lower_label"),
              upperLabel: t("templates.professional_development_survey_question_4_upper_label"),
              required: true,
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceMulti,
              headline: t("templates.professional_development_survey_question_5_headline"),
              required: true,
              shuffleOption: "exceptLast",
              choices: [
                t("templates.professional_development_survey_question_5_choice_1"),
                t("templates.professional_development_survey_question_5_choice_2"),
                t("templates.professional_development_survey_question_5_choice_3"),
                t("templates.professional_development_survey_question_5_choice_4"),
                t("templates.professional_development_survey_question_5_choice_5"),
                t("templates.professional_development_survey_question_5_choice_6"),
              ],
              containsOther: true,
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const rateCheckoutExperience = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  const reusableElementIds = [createId(), createId(), createId()];
  const block3Id = createId(); // Pre-generate ID for Block 3 (referenced by Block 1 logic)
  return buildSurvey(
    {
      name: t("templates.rate_checkout_experience_name"),
      role: "productManager",
      industries: ["eCommerce"],
      channels: ["website", "app"],
      description: t("templates.rate_checkout_experience_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              id: reusableElementIds[0],
              range: 5,
              scale: "number",
              headline: t("templates.rate_checkout_experience_question_1_headline"),
              required: true,
              lowerLabel: t("templates.rate_checkout_experience_question_1_lower_label"),
              upperLabel: t("templates.rate_checkout_experience_question_1_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "and",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[0],
                      type: "element",
                    },
                    operator: "isGreaterThanOrEqual",
                    rightOperand: {
                      type: "static",
                      value: 4,
                    },
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: block3Id,
                },
              ],
            },
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.rate_checkout_experience_question_2_headline"),
              required: true,
              placeholder: t("templates.rate_checkout_experience_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.rate_checkout_experience_question_3_headline"),
              required: true,
              placeholder: t("templates.rate_checkout_experience_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const measureSearchExperience = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  const reusableElementIds = [createId(), createId(), createId()];
  const block3Id = createId(); // Pre-generate ID for Block 3 (referenced by Block 1 logic)
  return buildSurvey(
    {
      name: t("templates.measure_search_experience_name"),
      role: "productManager",
      industries: ["saas", "eCommerce"],
      channels: ["app", "website"],
      description: t("templates.measure_search_experience_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              id: reusableElementIds[0],
              range: 5,
              scale: "number",
              headline: t("templates.measure_search_experience_question_1_headline"),
              required: true,
              lowerLabel: t("templates.measure_search_experience_question_1_lower_label"),
              upperLabel: t("templates.measure_search_experience_question_1_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "and",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[0],
                      type: "element",
                    },
                    operator: "isGreaterThanOrEqual",
                    rightOperand: {
                      type: "static",
                      value: 4,
                    },
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: block3Id,
                },
              ],
            },
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.measure_search_experience_question_2_headline"),
              required: true,
              placeholder: t("templates.measure_search_experience_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.measure_search_experience_question_3_headline"),
              required: true,
              placeholder: t("templates.measure_search_experience_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const evaluateContentQuality = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  const reusableElementIds = [createId(), createId(), createId()];
  const block3Id = createId(); // Pre-generate ID for Block 3 (referenced by Block 1 logic)
  return buildSurvey(
    {
      name: t("templates.evaluate_content_quality_name"),
      role: "marketing",
      industries: ["other"],
      channels: ["website"],
      description: t("templates.evaluate_content_quality_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              id: reusableElementIds[0],
              range: 5,
              scale: "number",
              headline: t("templates.evaluate_content_quality_question_1_headline"),
              required: true,
              lowerLabel: t("templates.evaluate_content_quality_question_1_lower_label"),
              upperLabel: t("templates.evaluate_content_quality_question_1_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "and",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[0],
                      type: "element",
                    },
                    operator: "isGreaterThanOrEqual",
                    rightOperand: {
                      type: "static",
                      value: 4,
                    },
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: block3Id,
                },
              ],
            },
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.evaluate_content_quality_question_2_headline"),
              required: true,
              placeholder: t("templates.evaluate_content_quality_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.evaluate_content_quality_question_3_headline"),
              required: true,
              placeholder: t("templates.evaluate_content_quality_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const measureTaskAccomplishment = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  const reusableElementIds = [createId(), createId(), createId(), createId(), createId()];
  const reusableOptionIds = [createId(), createId(), createId()];
  const block2Id = createId(); // Pre-generate IDs for blocks referenced by logic
  const block4Id = createId();
  const block5Id = createId();
  return buildSurvey(
    {
      name: t("templates.measure_task_accomplishment_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app", "website"],
      description: t("templates.measure_task_accomplishment_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              id: reusableElementIds[0],
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.measure_task_accomplishment_question_1_option_1_label"),
                t("templates.measure_task_accomplishment_question_1_option_2_label"),
                t("templates.measure_task_accomplishment_question_1_option_3_label"),
              ],
              choiceIds: [reusableOptionIds[0], reusableOptionIds[1], reusableOptionIds[2]],
              headline: t("templates.measure_task_accomplishment_question_1_headline"),
              required: true,
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[1], block4Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[0], block2Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[2], block5Id),
          ],
          t,
        }),
        buildBlock({
          id: block2Id,
          name: "Block 2",
          elements: [
            buildRatingElement({
              id: reusableElementIds[1],
              range: 5,
              scale: "number",
              headline: t("templates.measure_task_accomplishment_question_2_headline"),
              required: false,
              lowerLabel: t("templates.measure_task_accomplishment_question_2_lower_label"),
              upperLabel: t("templates.measure_task_accomplishment_question_2_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "and",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[1],
                      type: "element",
                    },
                    operator: "isGreaterThanOrEqual",
                    rightOperand: {
                      type: "static",
                      value: 4,
                    },
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: block4Id,
                },
              ],
            },
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.measure_task_accomplishment_question_3_headline"),
              required: false,
              placeholder: t("templates.measure_task_accomplishment_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "or",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[2],
                      type: "element",
                    },
                    operator: "isSubmitted",
                  },
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[1],
                      type: "element",
                    },
                    operator: "isSkipped",
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: localSurvey.endings[0].id,
                },
              ],
            },
          ],
          t,
        }),
        buildBlock({
          id: block4Id,
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[3],
              headline: t("templates.measure_task_accomplishment_question_4_headline"),
              required: false,
              inputType: "text",
            }),
          ],
          logic: [
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "or",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[3],
                      type: "element",
                    },
                    operator: "isSubmitted",
                  },
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[1],
                      type: "element",
                    },
                    operator: "isSkipped",
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: localSurvey.endings[0].id,
                },
              ],
            },
          ],
          buttonLabel: t("templates.measure_task_accomplishment_question_4_button_label"),
          t,
        }),
        buildBlock({
          id: block5Id,
          name: "Block 5",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[4],
              headline: t("templates.measure_task_accomplishment_question_5_headline"),
              required: true,
              placeholder: t("templates.measure_task_accomplishment_question_5_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.measure_task_accomplishment_question_5_button_label"),
          t,
        }),
      ],
    },
    t
  );
};

const identifySignUpBarriers = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  const reusableElementIds = [
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
  ];
  const reusableOptionIds = [createId(), createId(), createId(), createId(), createId()];
  const block4Id = createId(); // Pre-generate IDs for blocks referenced by logic
  const block5Id = createId();
  const block6Id = createId();
  const block7Id = createId();
  const block8Id = createId();
  const block9Id = createId();
  return buildSurvey(
    {
      name: t("templates.identify_sign_up_barriers_name"),
      role: "marketing",
      industries: ["saas", "eCommerce", "other"],
      channels: ["website"],
      description: t("templates.identify_sign_up_barriers_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildCTAElement({
              id: reusableElementIds[0],
              subheader: t("templates.identify_sign_up_barriers_question_1_html"),
              headline: t("templates.identify_sign_up_barriers_question_1_headline"),
              required: false,
            }),
          ],
          buttonLabel: t("templates.identify_sign_up_barriers_question_1_button_label"),
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              id: reusableElementIds[1],
              range: 5,
              scale: "number",
              headline: t("templates.identify_sign_up_barriers_question_2_headline"),
              required: true,
              lowerLabel: t("templates.identify_sign_up_barriers_question_2_lower_label"),
              upperLabel: t("templates.identify_sign_up_barriers_question_2_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "and",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[1],
                      type: "element",
                    },
                    operator: "equals",
                    rightOperand: {
                      type: "static",
                      value: 5,
                    },
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: localSurvey.endings[0].id,
                },
              ],
            },
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildMultipleChoiceElement({
              id: reusableElementIds[2],
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.identify_sign_up_barriers_question_3_choice_1_label"),
                t("templates.identify_sign_up_barriers_question_3_choice_2_label"),
                t("templates.identify_sign_up_barriers_question_3_choice_3_label"),
                t("templates.identify_sign_up_barriers_question_3_choice_4_label"),
                t("templates.identify_sign_up_barriers_question_3_choice_5_label"),
              ],
              choiceIds: [
                reusableOptionIds[0],
                reusableOptionIds[1],
                reusableOptionIds[2],
                reusableOptionIds[3],
                reusableOptionIds[4],
              ],
              headline: t("templates.identify_sign_up_barriers_question_3_headline"),
              required: true,
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(reusableElementIds[2], reusableOptionIds[0], block4Id),
            createBlockChoiceJumpLogic(reusableElementIds[2], reusableOptionIds[1], block5Id),
            createBlockChoiceJumpLogic(reusableElementIds[2], reusableOptionIds[2], block6Id),
            createBlockChoiceJumpLogic(reusableElementIds[2], reusableOptionIds[3], block7Id),
            createBlockChoiceJumpLogic(reusableElementIds[2], reusableOptionIds[4], block8Id),
          ],
          t,
        }),
        buildBlock({
          id: block4Id,
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[3],
              headline: t("templates.identify_sign_up_barriers_question_4_headline"),
              required: true,
              placeholder: t("templates.identify_sign_up_barriers_question_4_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[3], block9Id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block5Id,
          name: "Block 5",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[4],
              headline: t("templates.identify_sign_up_barriers_question_5_headline"),
              required: true,
              placeholder: t("templates.identify_sign_up_barriers_question_5_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[4], block9Id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block6Id,
          name: "Block 6",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[5],
              headline: t("templates.identify_sign_up_barriers_question_6_headline"),
              required: true,
              placeholder: t("templates.identify_sign_up_barriers_question_6_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[5], block9Id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block7Id,
          name: "Block 7",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[6],
              headline: t("templates.identify_sign_up_barriers_question_7_headline"),
              required: true,
              placeholder: t("templates.identify_sign_up_barriers_question_7_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[6], block9Id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block8Id,
          name: "Block 8",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[7],
              headline: t("templates.identify_sign_up_barriers_question_8_headline"),
              required: true,
              placeholder: t("templates.identify_sign_up_barriers_question_8_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          id: block9Id,
          name: "Block 9",
          elements: [
            buildCTAElement({
              id: reusableElementIds[8],
              subheader: t("templates.identify_sign_up_barriers_question_9_html"),
              headline: t("templates.identify_sign_up_barriers_question_9_headline"),
              required: false,
              buttonUrl: "#/auth/signup",
              buttonExternal: true,
              ctaButtonLabel: t("templates.identify_sign_up_barriers_question_9_button_label"),
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const buildProductRoadmap = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.build_product_roadmap_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["app", "link"],
      description: t("templates.build_product_roadmap_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.build_product_roadmap_question_1_headline"),
              required: true,
              lowerLabel: t("templates.build_product_roadmap_question_1_lower_label"),
              upperLabel: t("templates.build_product_roadmap_question_1_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              headline: t("templates.build_product_roadmap_question_2_headline"),
              required: true,
              placeholder: t("templates.build_product_roadmap_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const understandPurchaseIntention = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  const reusableElementIds = [createId(), createId(), createId()];
  const block2Id = createId(); // Pre-generate IDs for blocks referenced by logic
  const block3Id = createId();
  return buildSurvey(
    {
      name: t("templates.understand_purchase_intention_name"),
      role: "sales",
      industries: ["eCommerce"],
      channels: ["website", "link", "app"],
      description: t("templates.understand_purchase_intention_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              id: reusableElementIds[0],
              range: 5,
              scale: "number",
              headline: t("templates.understand_purchase_intention_question_1_headline"),
              required: true,
              lowerLabel: t("templates.understand_purchase_intention_question_1_lower_label"),
              upperLabel: t("templates.understand_purchase_intention_question_1_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(reusableElementIds[0], 2, block2Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], 3, block3Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], 4, block3Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], 5, localSurvey.endings[0].id),
          ],
          t,
        }),
        buildBlock({
          id: block2Id,
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.understand_purchase_intention_question_2_headline"),
              required: false,
              placeholder: t("templates.understand_purchase_intention_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [
            createBlockJumpLogic(reusableElementIds[1], localSurvey.endings[0].id, "isSubmitted"),
            createBlockJumpLogic(reusableElementIds[1], localSurvey.endings[0].id, "isSkipped"),
          ],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.understand_purchase_intention_question_3_headline"),
              required: true,
              placeholder: t("templates.understand_purchase_intention_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const improveNewsletterContent = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  const reusableElementIds = [createId(), createId(), createId()];
  const block2Id = createId(); // Pre-generate IDs for blocks referenced by logic
  const block3Id = createId();
  return buildSurvey(
    {
      name: t("templates.improve_newsletter_content_name"),
      role: "marketing",
      industries: ["eCommerce", "saas", "other"],
      channels: ["link"],
      description: t("templates.improve_newsletter_content_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              id: reusableElementIds[0],
              range: 5,
              scale: "smiley",
              headline: t("templates.improve_newsletter_content_question_1_headline"),
              required: true,
              lowerLabel: t("templates.improve_newsletter_content_question_1_lower_label"),
              upperLabel: t("templates.improve_newsletter_content_question_1_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(reusableElementIds[0], 5, block3Id),
            {
              id: createId(),
              conditions: {
                id: createId(),
                connector: "and",
                conditions: [
                  {
                    id: createId(),
                    leftOperand: {
                      value: reusableElementIds[0],
                      type: "element",
                    },
                    operator: "isLessThan",
                    rightOperand: {
                      type: "static",
                      value: 5,
                    },
                  },
                ],
              },
              actions: [
                {
                  id: createId(),
                  objective: "jumpToBlock",
                  target: block2Id,
                },
              ],
            },
          ],
          t,
        }),
        buildBlock({
          id: block2Id,
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.improve_newsletter_content_question_2_headline"),
              required: false,
              placeholder: t("templates.improve_newsletter_content_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [
            createBlockJumpLogic(reusableElementIds[1], localSurvey.endings[0].id, "isSubmitted"),
            createBlockJumpLogic(reusableElementIds[1], localSurvey.endings[0].id, "isSkipped"),
          ],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildCTAElement({
              id: reusableElementIds[2],
              subheader: t("templates.improve_newsletter_content_question_3_html"),
              headline: t("templates.improve_newsletter_content_question_3_headline"),
              required: false,
              buttonUrl: "https://formbricks.com",
              buttonExternal: true,
              ctaButtonLabel: t("templates.improve_newsletter_content_question_3_button_label"),
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const evaluateAProductIdea = (t: TFunction): TTemplate => {
  const reusableElementIds = [
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
    createId(),
  ];
  const block3Id = createId(); // Pre-generate IDs for blocks referenced by logic
  const block4Id = createId();
  const block6Id = createId();
  const block7Id = createId();
  const block8Id = createId();
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.evaluate_a_product_idea_name"),
      role: "productManager",
      industries: ["saas", "other"],
      channels: ["link", "app"],
      description: t("templates.evaluate_a_product_idea_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildCTAElement({
              id: reusableElementIds[0],
              subheader: t("templates.evaluate_a_product_idea_question_1_html"),
              headline: t("templates.evaluate_a_product_idea_question_1_headline"),
              required: false,
            }),
          ],
          buttonLabel: t("templates.evaluate_a_product_idea_question_1_button_label"),
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              id: reusableElementIds[1],
              range: 5,
              scale: "number",
              headline: t("templates.evaluate_a_product_idea_question_2_headline"),
              required: true,
              lowerLabel: t("templates.evaluate_a_product_idea_question_2_lower_label"),
              upperLabel: t("templates.evaluate_a_product_idea_question_2_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(reusableElementIds[1], 3, block3Id),
            createBlockChoiceJumpLogic(reusableElementIds[1], 4, block4Id),
          ],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.evaluate_a_product_idea_question_3_headline"),
              required: true,
              placeholder: t("templates.evaluate_a_product_idea_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          id: block4Id,
          name: "Block 4",
          elements: [
            buildCTAElement({
              id: reusableElementIds[3],
              subheader: t("templates.evaluate_a_product_idea_question_4_html"),
              headline: t("templates.evaluate_a_product_idea_question_4_headline"),
              required: false,
            }),
          ],
          buttonLabel: t("templates.evaluate_a_product_idea_question_4_button_label"),
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildRatingElement({
              id: reusableElementIds[4],
              range: 5,
              scale: "number",
              headline: t("templates.evaluate_a_product_idea_question_5_headline"),
              required: true,
              lowerLabel: t("templates.evaluate_a_product_idea_question_5_lower_label"),
              upperLabel: t("templates.evaluate_a_product_idea_question_5_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(reusableElementIds[4], 3, block6Id),
            createBlockChoiceJumpLogic(reusableElementIds[4], 4, block7Id),
          ],
          t,
        }),
        buildBlock({
          id: block6Id,
          name: "Block 6",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[5],
              headline: t("templates.evaluate_a_product_idea_question_6_headline"),
              required: true,
              placeholder: t("templates.evaluate_a_product_idea_question_6_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[5], block8Id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block7Id,
          name: "Block 7",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[6],
              headline: t("templates.evaluate_a_product_idea_question_7_headline"),
              required: true,
              placeholder: t("templates.evaluate_a_product_idea_question_7_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          id: block8Id,
          name: "Block 8",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[7],
              headline: t("templates.evaluate_a_product_idea_question_8_headline"),
              required: false,
              placeholder: t("templates.evaluate_a_product_idea_question_8_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const understandLowEngagement = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  const reusableElementIds = [createId(), createId(), createId(), createId(), createId(), createId()];
  const reusableOptionIds = [createId(), createId(), createId(), createId()];
  const block2Id = createId(); // Pre-generate IDs for blocks referenced by logic
  const block3Id = createId();
  const block4Id = createId();
  const block5Id = createId();
  const block6Id = createId();
  return buildSurvey(
    {
      name: t("templates.understand_low_engagement_name"),
      role: "productManager",
      industries: ["saas"],
      channels: ["link"],
      description: t("templates.understand_low_engagement_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              id: reusableElementIds[0],
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.understand_low_engagement_question_1_choice_1"),
                t("templates.understand_low_engagement_question_1_choice_2"),
                t("templates.understand_low_engagement_question_1_choice_3"),
                t("templates.understand_low_engagement_question_1_choice_4"),
                t("templates.understand_low_engagement_question_1_choice_5"),
              ],
              choiceIds: [
                reusableOptionIds[0],
                reusableOptionIds[1],
                reusableOptionIds[2],
                reusableOptionIds[3],
              ],
              headline: t("templates.understand_low_engagement_question_1_headline"),
              required: true,
              containsOther: true,
            }),
          ],
          logic: [
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[0], block2Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[1], block3Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[2], block4Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], reusableOptionIds[3], block5Id),
            createBlockChoiceJumpLogic(reusableElementIds[0], "other", block6Id),
          ],
          t,
        }),
        buildBlock({
          id: block2Id,
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[1],
              headline: t("templates.understand_low_engagement_question_2_headline"),
              required: true,
              placeholder: t("templates.understand_low_engagement_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[1], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block3Id,
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[2],
              headline: t("templates.understand_low_engagement_question_3_headline"),
              required: true,
              placeholder: t("templates.understand_low_engagement_question_3_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[2], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block4Id,
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[3],
              headline: t("templates.understand_low_engagement_question_4_headline"),
              required: true,
              placeholder: t("templates.understand_low_engagement_question_4_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[3], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block5Id,
          name: "Block 5",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[4],
              headline: t("templates.understand_low_engagement_question_5_headline"),
              required: true,
              placeholder: t("templates.understand_low_engagement_question_5_placeholder"),
              inputType: "text",
            }),
          ],
          logic: [createBlockJumpLogic(reusableElementIds[4], localSurvey.endings[0].id, "isSubmitted")],
          t,
        }),
        buildBlock({
          id: block6Id,
          name: "Block 6",
          elements: [
            buildOpenTextElement({
              id: reusableElementIds[5],
              headline: t("templates.understand_low_engagement_question_6_headline"),
              required: false,
              placeholder: t("templates.understand_low_engagement_question_6_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const employeeWellBeing = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.employee_well_being_name"),
      role: "peopleManager",
      industries: ["saas", "eCommerce", "other"],
      channels: ["link"],
      description: t("templates.employee_well_being_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: t("templates.employee_well_being_question_1_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.employee_well_being_question_1_lower_label"),
              upperLabel: t("templates.employee_well_being_question_1_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              headline: t("templates.employee_well_being_question_2_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.employee_well_being_question_2_lower_label"),
              upperLabel: t("templates.employee_well_being_question_2_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildRatingElement({
              headline: t("templates.employee_well_being_question_3_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.employee_well_being_question_3_lower_label"),
              upperLabel: t("templates.employee_well_being_question_3_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              headline: t("templates.employee_well_being_question_4_headline"),
              required: false,
              placeholder: t("templates.employee_well_being_question_4_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const longTermRetentionCheckIn = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.long_term_retention_check_in_name"),
      role: "peopleManager",
      industries: ["saas", "other"],
      channels: ["app", "link"],
      description: t("templates.long_term_retention_check_in_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "star",
              headline: t("templates.long_term_retention_check_in_question_1_headline"),
              required: true,
              lowerLabel: t("templates.long_term_retention_check_in_question_1_lower_label"),
              upperLabel: t("templates.long_term_retention_check_in_question_1_upper_label"),
              isColorCodingEnabled: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              headline: t("templates.long_term_retention_check_in_question_2_headline"),
              required: false,
              placeholder: t("templates.long_term_retention_check_in_question_2_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              shuffleOption: "none",
              choices: [
                t("templates.long_term_retention_check_in_question_3_choice_1"),
                t("templates.long_term_retention_check_in_question_3_choice_2"),
                t("templates.long_term_retention_check_in_question_3_choice_3"),
                t("templates.long_term_retention_check_in_question_3_choice_4"),
                t("templates.long_term_retention_check_in_question_3_choice_5"),
              ],
              headline: t("templates.long_term_retention_check_in_question_3_headline"),
              required: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "number",
              headline: t("templates.long_term_retention_check_in_question_4_headline"),
              required: true,
              lowerLabel: t("templates.long_term_retention_check_in_question_4_lower_label"),
              upperLabel: t("templates.long_term_retention_check_in_question_4_upper_label"),
              isColorCodingEnabled: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 5",
          elements: [
            buildOpenTextElement({
              headline: t("templates.long_term_retention_check_in_question_5_headline"),
              required: false,
              placeholder: t("templates.long_term_retention_check_in_question_5_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 6",
          elements: [
            buildNPSElement({
              headline: t("templates.long_term_retention_check_in_question_6_headline"),
              required: false,
              lowerLabel: t("templates.long_term_retention_check_in_question_6_lower_label"),
              upperLabel: t("templates.long_term_retention_check_in_question_6_upper_label"),
              isColorCodingEnabled: false,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 7",
          elements: [
            buildMultipleChoiceElement({
              type: TSurveyElementTypeEnum.MultipleChoiceMulti,
              shuffleOption: "none",
              choices: [
                t("templates.long_term_retention_check_in_question_7_choice_1"),
                t("templates.long_term_retention_check_in_question_7_choice_2"),
                t("templates.long_term_retention_check_in_question_7_choice_3"),
                t("templates.long_term_retention_check_in_question_7_choice_4"),
                t("templates.long_term_retention_check_in_question_7_choice_5"),
              ],
              headline: t("templates.long_term_retention_check_in_question_7_headline"),
              required: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 8",
          elements: [
            buildOpenTextElement({
              headline: t("templates.long_term_retention_check_in_question_8_headline"),
              required: false,
              placeholder: t("templates.long_term_retention_check_in_question_8_placeholder"),
              inputType: "text",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 9",
          elements: [
            buildRatingElement({
              range: 5,
              scale: "smiley",
              headline: t("templates.long_term_retention_check_in_question_9_headline"),
              required: true,
              lowerLabel: t("templates.long_term_retention_check_in_question_9_lower_label"),
              upperLabel: t("templates.long_term_retention_check_in_question_9_upper_label"),
              isColorCodingEnabled: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 10",
          elements: [
            buildOpenTextElement({
              headline: t("templates.long_term_retention_check_in_question_10_headline"),
              required: false,
              placeholder: t("templates.long_term_retention_check_in_question_10_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const professionalDevelopmentGrowth = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.professional_development_growth_survey_name"),
      role: "peopleManager",
      industries: ["saas", "eCommerce", "other"],
      channels: ["link"],
      description: t("templates.professional_development_growth_survey_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: t("templates.professional_development_growth_survey_question_1_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.professional_development_growth_survey_question_1_lower_label"),
              upperLabel: t("templates.professional_development_growth_survey_question_1_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              headline: t("templates.professional_development_growth_survey_question_2_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.professional_development_growth_survey_question_2_lower_label"),
              upperLabel: t("templates.professional_development_growth_survey_question_2_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildRatingElement({
              headline: t("templates.professional_development_growth_survey_question_3_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.professional_development_growth_survey_question_3_lower_label"),
              upperLabel: t("templates.professional_development_growth_survey_question_3_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              headline: t("templates.professional_development_growth_survey_question_4_headline"),
              required: false,
              placeholder: t("templates.professional_development_growth_survey_question_4_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const recognitionAndReward = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.recognition_and_reward_survey_name"),
      role: "peopleManager",
      industries: ["saas", "eCommerce", "other"],
      channels: ["link"],
      description: t("templates.recognition_and_reward_survey_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: t("templates.recognition_and_reward_survey_question_1_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.recognition_and_reward_survey_question_1_lower_label"),
              upperLabel: t("templates.recognition_and_reward_survey_question_1_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              headline: t("templates.recognition_and_reward_survey_question_2_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.recognition_and_reward_survey_question_2_lower_label"),
              upperLabel: t("templates.recognition_and_reward_survey_question_2_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildRatingElement({
              headline: t("templates.recognition_and_reward_survey_question_3_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.recognition_and_reward_survey_question_3_lower_label"),
              upperLabel: t("templates.recognition_and_reward_survey_question_3_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              headline: t("templates.recognition_and_reward_survey_question_4_headline"),
              required: false,
              placeholder: t("templates.recognition_and_reward_survey_question_4_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const alignmentAndEngagement = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.alignment_and_engagement_survey_name"),
      role: "peopleManager",
      industries: ["saas", "eCommerce", "other"],
      channels: ["link"],
      description: t("templates.alignment_and_engagement_survey_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: t("templates.alignment_and_engagement_survey_question_1_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.alignment_and_engagement_survey_question_1_lower_label"),
              upperLabel: t("templates.alignment_and_engagement_survey_question_1_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              headline: t("templates.alignment_and_engagement_survey_question_2_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.alignment_and_engagement_survey_question_2_lower_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildRatingElement({
              headline: t("templates.alignment_and_engagement_survey_question_3_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.alignment_and_engagement_survey_question_3_lower_label"),
              upperLabel: t("templates.alignment_and_engagement_survey_question_3_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              headline: t("templates.alignment_and_engagement_survey_question_4_headline"),
              required: false,
              placeholder: t("templates.alignment_and_engagement_survey_question_4_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

const supportiveWorkCulture = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: t("templates.supportive_work_culture_survey_name"),
      role: "peopleManager",
      industries: ["saas", "eCommerce", "other"],
      channels: ["link"],
      description: t("templates.supportive_work_culture_survey_description"),
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: t("templates.supportive_work_culture_survey_question_1_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.supportive_work_culture_survey_question_1_lower_label"),
              upperLabel: t("templates.supportive_work_culture_survey_question_1_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              headline: t("templates.supportive_work_culture_survey_question_2_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.supportive_work_culture_survey_question_2_lower_label"),
              upperLabel: t("templates.supportive_work_culture_survey_question_2_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildRatingElement({
              headline: t("templates.supportive_work_culture_survey_question_3_headline"),
              required: true,
              scale: "number",
              range: 10,
              lowerLabel: t("templates.supportive_work_culture_survey_question_3_lower_label"),
              upperLabel: t("templates.supportive_work_culture_survey_question_3_upper_label"),
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 4",
          elements: [
            buildOpenTextElement({
              headline: t("templates.supportive_work_culture_survey_question_4_headline"),
              required: false,
              placeholder: t("templates.supportive_work_culture_survey_question_4_placeholder"),
              inputType: "text",
            }),
          ],
          buttonLabel: t("templates.finish"),
          t,
        }),
      ],
    },
    t
  );
};

// ==========================================
// Banking Industry Templates
// ==========================================

const branchSatisfactionSurvey = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "Branch Satisfaction Survey",
      role: "customerSuccess",
      industries: ["banking"],
      channels: ["link", "voice"],
      description:
        "Measure customer satisfaction after a branch visit with CSAT rating and follow-up questions.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: "How would you rate your recent branch visit experience?",
              required: true,
              scale: "star",
              range: 5,
              lowerLabel: "Very Poor",
              upperLabel: "Excellent",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              headline: "What was the primary reason for your visit?",
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              choices: [
                "Account inquiry",
                "Loan application",
                "Card services",
                "Cash deposit/withdrawal",
                "Investment consultation",
              ],
              containsOther: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildNPSElement({
              headline: "How likely are you to recommend our branch to a friend or colleague?",
              required: true,
              lowerLabel: "Not likely",
              upperLabel: "Very likely",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const postCallBankingNPS = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "Post-Call Banking NPS",
      role: "customerSuccess",
      industries: ["banking"],
      channels: ["voice", "link"],
      description: "Net Promoter Score survey delivered after banking call center interactions.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildNPSElement({
              headline: "Based on your recent call, how likely are you to recommend our banking services?",
              required: true,
              lowerLabel: "Not at all likely",
              upperLabel: "Extremely likely",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              headline: "How would you rate the service provided by our agent?",
              required: true,
              scale: "number",
              range: 5,
              lowerLabel: "Poor",
              upperLabel: "Excellent",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const loanApplicationFeedback = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "Loan Application Feedback",
      role: "productManager",
      industries: ["banking"],
      channels: ["app", "website", "link"],
      description: "Gather feedback on the loan application process to identify friction points.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: "How easy was the loan application process?",
              required: true,
              scale: "number",
              range: 5,
              lowerLabel: "Very difficult",
              upperLabel: "Very easy",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              headline: "Which part of the process was most challenging?",
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              choices: [
                "Document upload",
                "Identity verification",
                "Understanding terms",
                "Long wait times",
                "None - it was smooth",
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              headline: "Any suggestions to improve the process?",
              required: false,
              inputType: "text",
              longAnswer: true,
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const mobileBankingUXSurvey = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "Mobile Banking UX Survey",
      role: "productManager",
      industries: ["banking"],
      channels: ["app"],
      description: "Evaluate the usability and experience of your mobile banking application.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: "How satisfied are you with the mobile banking app?",
              required: true,
              scale: "star",
              range: 5,
              lowerLabel: "Very unsatisfied",
              upperLabel: "Very satisfied",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              headline: "Which features do you use most frequently?",
              type: TSurveyElementTypeEnum.MultipleChoiceMulti,
              choices: [
                "Balance check",
                "Fund transfers",
                "Bill payments",
                "Card management",
                "Investment tracking",
                "Loan management",
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildNPSElement({
              headline: "How likely are you to recommend our mobile app to others?",
              required: true,
              lowerLabel: "Not likely",
              upperLabel: "Very likely",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

// ==========================================
// Telecom Industry Templates
// ==========================================

const postCallTelecomNPS = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "Post-Call Telecom NPS",
      role: "customerSuccess",
      industries: ["telecom"],
      channels: ["voice", "link"],
      description: "Post-call NPS survey for telecom support interactions via IVR or link.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildNPSElement({
              headline: "How likely are you to recommend our service based on this call?",
              required: true,
              lowerLabel: "Not at all likely",
              upperLabel: "Extremely likely",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              headline: "How would you rate the support agent's helpfulness?",
              required: true,
              scale: "number",
              range: 5,
              lowerLabel: "Not helpful",
              upperLabel: "Very helpful",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const networkSatisfactionSurvey = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "Network Satisfaction Survey",
      role: "productManager",
      industries: ["telecom"],
      channels: ["app", "link"],
      description: "Measure customer satisfaction with network quality, coverage, and speed.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: "How would you rate your overall network experience?",
              required: true,
              scale: "star",
              range: 5,
              lowerLabel: "Very poor",
              upperLabel: "Excellent",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              headline: "What network issue do you experience most frequently?",
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              choices: [
                "Slow data speed",
                "Call drops",
                "Poor indoor coverage",
                "No signal in certain areas",
                "No issues",
              ],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildNPSElement({
              headline: "How likely are you to recommend our network to others?",
              required: true,
              lowerLabel: "Not likely",
              upperLabel: "Very likely",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const planChangeSatisfaction = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "Plan Change Satisfaction",
      role: "sales",
      industries: ["telecom"],
      channels: ["app", "website", "link"],
      description: "Gather feedback after a customer upgrades or changes their telecom plan.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: "How satisfied are you with your new plan?",
              required: true,
              scale: "star",
              range: 5,
              lowerLabel: "Very unsatisfied",
              upperLabel: "Very satisfied",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              headline: "What was the main reason for changing your plan?",
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              choices: [
                "Better data allowance",
                "Lower price",
                "More international minutes",
                "Better device offer",
                "Recommended by someone",
              ],
              containsOther: true,
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const technicalSupportCSAT = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "Technical Support CSAT (IVR)",
      role: "customerSuccess",
      industries: ["telecom"],
      channels: ["voice"],
      description: "Quick IVR satisfaction survey after technical support calls.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: "How satisfied are you with the technical support you received?",
              required: true,
              scale: "number",
              range: 5,
              lowerLabel: "Very unsatisfied",
              upperLabel: "Very satisfied",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              headline: "Was your issue resolved?",
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              choices: ["Yes, fully resolved", "Partially resolved", "No, not resolved"],
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

// ==========================================
// Voice (IVR) Cross-Industry Templates
// ==========================================

const ivrPostCallCSAT = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "IVR Post-Call CSAT",
      role: "customerSuccess",
      industries: ["banking", "telecom", "other"],
      channels: ["voice"],
      description: "Single-question CSAT via IVR after any customer service call. Press 1-5 on keypad.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: "How satisfied are you with the service you received today?",
              required: true,
              scale: "number",
              range: 5,
              lowerLabel: "Very unsatisfied",
              upperLabel: "Very satisfied",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const ivrNPSSurvey = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "IVR NPS Survey",
      role: "customerSuccess",
      industries: ["banking", "telecom", "other"],
      channels: ["voice"],
      description: "Net Promoter Score survey via phone IVR. Callers press 0-10 on their keypad.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildNPSElement({
              headline: "How likely are you to recommend us to a friend or colleague?",
              required: true,
              lowerLabel: "Not at all likely",
              upperLabel: "Extremely likely",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const ivrServiceRating = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "IVR Service Rating",
      role: "customerSuccess",
      industries: ["banking", "telecom", "other"],
      channels: ["voice"],
      description: "Quick 1-5 star service rating via phone keypad. Ideal for post-interaction feedback.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: "Please rate the service you received today on a scale of 1 to 5.",
              required: true,
              scale: "number",
              range: 5,
              lowerLabel: "Poor",
              upperLabel: "Excellent",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const storeVisitFeedback = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "Store Visit Feedback",
      role: "sales",
      industries: ["telecom"],
      channels: ["link"],
      description: "Collect feedback after telecom store visits via SMS link.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: "How would you rate your store visit experience?",
              required: true,
              scale: "star",
              range: 5,
              lowerLabel: "Poor",
              upperLabel: "Excellent",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildMultipleChoiceElement({
              headline: "What was the purpose of your visit?",
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              choices: [
                "New subscription",
                "Device purchase",
                "Plan change",
                "Technical support",
                "Bill payment",
              ],
              containsOther: true,
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildNPSElement({
              headline: "How likely are you to visit this store again?",
              required: true,
              lowerLabel: "Not likely",
              upperLabel: "Very likely",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

// WhatsApp & SMS Messaging Templates

const whatsappCSAT = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "WhatsApp CSAT Survey",
      role: "customerSuccess",
      industries: ["banking", "telecom", "eCommerce", "other"],
      channels: ["whatsapp"],
      description: "Customer satisfaction survey delivered via WhatsApp after a service interaction.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildRatingElement({
              headline: "How satisfied are you with the support you received?",
              required: true,
              scale: "number",
              range: 5,
              lowerLabel: "Very dissatisfied",
              upperLabel: "Very satisfied",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildOpenTextElement({
              headline: "What could we have done better?",
              required: false,
              inputType: "text",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const smsNPS = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "SMS NPS Survey",
      role: "customerSuccess",
      industries: ["banking", "telecom", "eCommerce", "other"],
      channels: ["sms"],
      description: "Short NPS survey via SMS. Customers reply with a number 0-10.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildNPSElement({
              headline: "How likely are you to recommend us? Reply 0-10.",
              required: true,
              lowerLabel: "Not at all likely",
              upperLabel: "Extremely likely",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const whatsappPostChat = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "WhatsApp Post-Chat Feedback",
      role: "customerSuccess",
      industries: ["banking", "telecom", "eCommerce", "saas", "other"],
      channels: ["whatsapp"],
      description: "Collect feedback after a live chat or support conversation via WhatsApp.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              headline: "Was your issue resolved?",
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              choices: ["Yes, completely", "Partially", "No, not at all"],
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 2",
          elements: [
            buildRatingElement({
              headline: "How would you rate your agent's helpfulness?",
              required: true,
              scale: "number",
              range: 5,
              lowerLabel: "Not helpful",
              upperLabel: "Very helpful",
            }),
          ],
          t,
        }),
        buildBlock({
          name: "Block 3",
          elements: [
            buildOpenTextElement({
              headline: "Any additional comments?",
              required: false,
              inputType: "text",
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

const smsQuickFeedback = (t: TFunction): TTemplate => {
  const localSurvey = getDefaultSurveyPreset(t);
  return buildSurvey(
    {
      name: "SMS Quick Feedback",
      role: "customerSuccess",
      industries: ["banking", "telecom", "eCommerce", "other"],
      channels: ["sms"],
      description: "One-question satisfaction check via SMS. Quick and easy for customers.",
      endings: localSurvey.endings,
      hiddenFields: hiddenFieldsDefault,
      blocks: [
        buildBlock({
          name: "Block 1",
          elements: [
            buildMultipleChoiceElement({
              headline: "How was your experience today?",
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              choices: ["Great", "Good", "Okay", "Poor"],
            }),
          ],
          t,
        }),
      ],
    },
    t
  );
};

export const templates = (t: TFunction): TTemplate[] => [
  cartAbandonmentSurvey(t),
  siteAbandonmentSurvey(t),
  productMarketFitSuperhuman(t),
  onboardingSegmentation(t),
  churnSurvey(t),
  earnedAdvocacyScore(t),
  usabilityScoreRatingSurvey(t),
  improveTrialConversion(t),
  reviewPrompt(t),
  interviewPrompt(t),
  improveActivationRate(t),
  uncoverStrengthsAndWeaknesses(t),
  productMarketFitShort(t),
  marketAttribution(t),
  changingSubscriptionExperience(t),
  identifyCustomerGoals(t),
  featureChaser(t),
  fakeDoorFollowUp(t),
  feedbackBox(t),
  integrationSetupSurvey(t),
  newIntegrationSurvey(t),
  docsFeedback(t),
  nps(t),
  customerSatisfactionScore(t),
  collectFeedback(t),
  identifyUpsellOpportunities(t),
  prioritizeFeatures(t),
  gaugeFeatureSatisfaction(t),
  marketSiteClarity(t),
  customerEffortScore(t),
  rateCheckoutExperience(t),
  measureSearchExperience(t),
  evaluateContentQuality(t),
  measureTaskAccomplishment(t),
  identifySignUpBarriers(t),
  buildProductRoadmap(t),
  understandPurchaseIntention(t),
  improveNewsletterContent(t),
  evaluateAProductIdea(t),
  understandLowEngagement(t),
  employeeSatisfaction(t),
  employeeWellBeing(t),
  longTermRetentionCheckIn(t),
  supportiveWorkCulture(t),
  alignmentAndEngagement(t),
  recognitionAndReward(t),
  professionalDevelopmentGrowth(t),
  professionalDevelopmentSurvey(t),
  careerDevelopmentSurvey(t),
  // Banking
  branchSatisfactionSurvey(t),
  postCallBankingNPS(t),
  loanApplicationFeedback(t),
  mobileBankingUXSurvey(t),
  // Telecom
  postCallTelecomNPS(t),
  networkSatisfactionSurvey(t),
  planChangeSatisfaction(t),
  technicalSupportCSAT(t),
  storeVisitFeedback(t),
  // Voice (IVR) Cross-Industry
  ivrPostCallCSAT(t),
  ivrNPSSurvey(t),
  ivrServiceRating(t),
  // Messaging (WhatsApp & SMS)
  whatsappCSAT(t),
  smsNPS(t),
  whatsappPostChat(t),
  smsQuickFeedback(t),
];

export const customSurveyTemplate = (t: TFunction): TTemplate => {
  return {
    name: t("templates.custom_survey_name"),
    description: t("templates.custom_survey_description"),
    preset: {
      ...getDefaultSurveyPreset(t),
      name: t("templates.custom_survey_name"),
      blocks: [
        {
          id: createId(),
          name: t("templates.custom_survey_block_1_name"),
          elements: [
            {
              id: createId(),
              type: TSurveyElementTypeEnum.OpenText,
              headline: createI18nString(t("templates.custom_survey_question_1_headline"), []),
              placeholder: createI18nString(t("templates.custom_survey_question_1_placeholder"), []),
              required: true,
              inputType: "text",
              charLimit: {
                enabled: false,
              },
            } as TSurveyOpenTextElement,
          ],
          // Button labels at block level with default key for i18n support
          buttonLabel: createI18nString(t("templates.next"), []),
        },
      ],
    },
  };
};

export const previewSurvey = (projectName: string, t: TFunction): TSurvey => {
  return {
    id: "cltxxaa6x0000g8hacxdxejeu",
    createdAt: new Date(),
    updatedAt: new Date(),
    name: t("templates.preview_survey_name"),
    type: "link" as const,
    environmentId: "cltwumfcz0009echxg02fh7oa",
    channelId: null,
    createdBy: "cltwumfbz0000echxysz6ptvq",
    status: "inProgress" as const,
    welcomeCard: {
      enabled: false,
      headline: createI18nString(t("templates.preview_survey_welcome_card_headline"), []),
      timeToFinish: false,
      showResponseCount: false,
    },
    styling: null,
    segment: null,
    blocks: [
      {
        id: "cltxxaa6x0000g8hacxdxeje1",
        name: "Block 1",
        elements: [
          {
            ...buildMultipleChoiceElement({
              id: "rjpu42ps6dzirsn9ds6eydgt",
              type: TSurveyElementTypeEnum.MultipleChoiceSingle,
              choiceIds: ["x6wty2s72v7vd538aadpurqx", "fbcj4530t2n357ymjp2h28d6"],
              choices: [
                t("templates.preview_survey_question_2_choice_1_label"),
                t("templates.preview_survey_question_2_choice_2_label"),
              ],
              headline: t("templates.preview_survey_question_2_headline"),
              required: true,
              shuffleOption: "none",
            }),
            isDraft: true,
          },
        ],
        backButtonLabel: createI18nString(t("templates.preview_survey_question_2_back_button_label"), []),
      },
      {
        id: "cltxxaa6x0000g8hacxdxeje2",
        name: "Block 2",
        elements: [
          {
            ...buildRatingElement({
              id: "lbdxozwikh838yc6a8vbwuju",
              range: 5,
              scale: "star",
              headline: t("templates.preview_survey_question_1_headline", { projectName }),
              required: true,
              subheader: t("templates.preview_survey_question_1_subheader"),
              lowerLabel: t("templates.preview_survey_question_1_lower_label"),
              upperLabel: t("templates.preview_survey_question_1_upper_label"),
            }),
            isDraft: true,
          },
        ],
        buttonLabel: createI18nString(t("templates.next"), []),
        backButtonLabel: createI18nString(t("templates.preview_survey_question_2_back_button_label"), []),
      },
    ],
    endings: [
      {
        id: "cltyqp5ng000108l9dmxw6nde",
        type: "endScreen",
        headline: createI18nString(t("templates.preview_survey_ending_card_headline"), []),
        subheader: createI18nString(t("templates.preview_survey_ending_card_description"), []),
      },
    ],
    hiddenFields: {
      enabled: true,
      fieldIds: [],
    },
    variables: [],
    displayOption: "displayOnce",
    recontactDays: null,
    displayLimit: null,
    autoClose: null,
    recaptcha: null,
    delay: 0,
    displayPercentage: null,
    autoComplete: 50,
    isVerifyEmailEnabled: false,
    isSingleResponsePerEmailEnabled: false,
    projectOverwrites: null,
    surveyClosedMessage: null,
    singleUse: {
      enabled: false,
      isEncrypted: true,
    },
    pin: null,
    languages: [],
    triggers: [],
    showLanguageSwitch: false,
    followUps: [],
    isBackButtonHidden: false,
    isCaptureIpEnabled: false,
    metadata: {},
    questions: [], // Required for build-time type checking (Zod defaults to [] at runtime)
    slug: null,
  };
};

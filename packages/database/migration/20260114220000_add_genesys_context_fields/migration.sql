-- AlterTable: Add Genesys Cloud Contact Center context fields to Response model
ALTER TABLE "public"."Response" ADD COLUMN "genesys_conversation_id" TEXT;
ALTER TABLE "public"."Response" ADD COLUMN "genesys_agent_id" TEXT;
ALTER TABLE "public"."Response" ADD COLUMN "genesys_agent_name" TEXT;
ALTER TABLE "public"."Response" ADD COLUMN "genesys_queue_id" TEXT;
ALTER TABLE "public"."Response" ADD COLUMN "genesys_queue_name" TEXT;
ALTER TABLE "public"."Response" ADD COLUMN "genesys_handle_time" INTEGER;
ALTER TABLE "public"."Response" ADD COLUMN "genesys_wrap_code" TEXT;
ALTER TABLE "public"."Response" ADD COLUMN "genesys_direction" TEXT;
ALTER TABLE "public"."Response" ADD COLUMN "genesys_ani" TEXT;
ALTER TABLE "public"."Response" ADD COLUMN "genesys_dnis" TEXT;
ALTER TABLE "public"."Response" ADD COLUMN "genesys_conversation_start" TIMESTAMP(3);
ALTER TABLE "public"."Response" ADD COLUMN "genesys_conversation_end" TIMESTAMP(3);
ALTER TABLE "public"."Response" ADD COLUMN "survey_delivery_channel" TEXT;
ALTER TABLE "public"."Response" ADD COLUMN "survey_delivered_at" TIMESTAMP(3);

-- CreateIndex: Index for looking up responses by Genesys conversation
CREATE INDEX "Response_genesys_conversation_id_idx" ON "public"."Response"("genesys_conversation_id");

-- CreateIndex: Index for agent performance reporting
CREATE INDEX "Response_genesys_agent_id_created_at_idx" ON "public"."Response"("genesys_agent_id", "created_at");

-- CreateIndex: Index for queue performance reporting
CREATE INDEX "Response_genesys_queue_id_created_at_idx" ON "public"."Response"("genesys_queue_id", "created_at");

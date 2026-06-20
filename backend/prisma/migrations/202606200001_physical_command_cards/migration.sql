CREATE TABLE "command_cards" (
    "id" TEXT NOT NULL,
    "restaurant_id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "command_cards_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "tabs" ADD COLUMN "command_card_id" TEXT;
ALTER TABLE "orders" ADD COLUMN "delivery_table_id" TEXT;

CREATE UNIQUE INDEX "command_cards_restaurant_id_number_key" ON "command_cards"("restaurant_id", "number");
CREATE INDEX "command_cards_restaurant_id_active_idx" ON "command_cards"("restaurant_id", "active");
CREATE INDEX "orders_delivery_table_id_idx" ON "orders"("delivery_table_id");

ALTER TABLE "command_cards" ADD CONSTRAINT "command_cards_restaurant_id_fkey" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "tabs" ADD CONSTRAINT "tabs_command_card_id_fkey" FOREIGN KEY ("command_card_id") REFERENCES "command_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_table_id_fkey" FOREIGN KEY ("delivery_table_id") REFERENCES "tables"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "command_cards" ("id", "restaurant_id", "number", "active", "created_at", "updated_at")
SELECT 'legacy_' || md5("restaurant_id" || ':' || "number"::text), "restaurant_id", "number", true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "tabs"
GROUP BY "restaurant_id", "number"
ON CONFLICT ("restaurant_id", "number") DO NOTHING;

UPDATE "tabs" AS t
SET "command_card_id" = c."id"
FROM "command_cards" AS c
WHERE c."restaurant_id" = t."restaurant_id" AND c."number" = t."number";

UPDATE "orders" AS o
SET "delivery_table_id" = t."table_id"
FROM "tabs" AS t
WHERE t."id" = o."tab_id";

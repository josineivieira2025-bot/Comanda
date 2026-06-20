ALTER TABLE "users" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "users"
SET "permissions" = CASE "role"::text
  WHEN 'MANAGER' THEN ARRAY['dashboard.view','tables.view','tables.edit','kds.view','kds.edit','orders.view','orders.edit','stock.view','stock.edit','finance.view','finance.edit','customers.view','customers.edit','menu.view','menu.edit','reports.view','settings.view']
  WHEN 'WAITER' THEN ARRAY['tables.view','orders.view','orders.edit','customers.view','menu.view']
  WHEN 'KITCHEN' THEN ARRAY['kds.view','kds.edit']
  WHEN 'CASHIER' THEN ARRAY['finance.view','finance.edit']
  ELSE ARRAY[]::TEXT[]
END
WHERE "role"::text <> 'ADMIN';

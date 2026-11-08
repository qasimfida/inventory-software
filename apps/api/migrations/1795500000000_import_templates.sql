-- Up Migration
CREATE TABLE product_import_templates (
  id uuid PRIMARY KEY,
  business_id uuid NOT NULL REFERENCES businesses(id),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  mapping jsonb NOT NULL CHECK (jsonb_typeof(mapping) = 'object'),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX product_import_templates_business_name ON product_import_templates(business_id,lower(name));

-- Down Migration
DROP TABLE product_import_templates;

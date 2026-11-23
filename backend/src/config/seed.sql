-- ============================================================
-- Meridian ERP - Initial Master Seed Data
-- Run AFTER schema.sql to initialize system requirements
-- Command: psql -U postgres -d bizsuite_erp -f seed.sql
-- ============================================================

-- 1. Base Product Categories (Required for Category dropdowns & schema foreign keys)
INSERT INTO product_categories (id, name, slug, description) VALUES
  (uuid_generate_v4(), 'Electronics', 'electronics', 'Electronic devices and accessories'),
  (uuid_generate_v4(), 'Office Supplies', 'office-supplies', 'Stationery and office items'),
  (uuid_generate_v4(), 'Furniture', 'furniture', 'Office and home furniture'),
  (uuid_generate_v4(), 'IT Hardware', 'it-hardware', 'Computers, servers, networking'),
  (uuid_generate_v4(), 'Raw Materials', 'raw-materials', 'Manufacturing raw materials')
ON CONFLICT (slug) DO NOTHING;

SELECT 'Master categories initialized successfully! ✅' as message;

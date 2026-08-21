-- 001_roles.sql: Initial system roles

INSERT INTO roles (name, description) VALUES
('CUSTOMER', 'Standard customer account for browsing, shopping, and tracking orders'),
('ADMIN', 'Full administrative access for store owner Akash Chaudhary and store staff')
ON CONFLICT (name) DO NOTHING;

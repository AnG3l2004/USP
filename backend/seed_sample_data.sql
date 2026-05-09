-- Примерни данни за alertix (пусни в MySQL Workbench след като вече имаш таблиците от schema.sql)
-- Ако базата е стара: първо migration_disaster_metrics.sql, или пресъздай disasters от актуалния schema.sql
-- Ако получиш грешка за дублиран ключ (PRIMARY/UNIQUE), смени id/email по-долу или изтрий старите редове.
-- ON DUPLICATE KEY UPDATE ползва псевдоним на реда (MySQL 8.0.19+), за да няма предупреждение 1287 за VALUES().

USE alertix;

-- ========== users ==========
-- password_hash е примерен текст (не е реална bcrypt парола); за истински вход трябва да се ползва API/регистрация.
INSERT INTO users (name, email, region, role, status, password_hash) VALUES
  ('Мария Иванова', 'maria.ivanova@example.com', 'Varna', 'user', 'active', 'demo_hash_not_for_production'),
  ('Георги Петров', 'georgi.petrov@example.com', 'Plovdiv', 'user', 'active', 'demo_hash_not_for_production'),
  ('Оператор Център', 'operator@alertix.local', 'Sofia', 'operator', 'active', 'demo_hash_not_for_production'),
  ('Админ Система', 'admin@alertix.local', 'Sofia', 'admin', 'active', 'demo_hash_not_for_production')
AS seed
ON DUPLICATE KEY UPDATE name = seed.name;

-- ========== disasters ==========
INSERT INTO disasters (
  id, type, time, place, region, damage, duration, level, status, notes,
  richter, focal_depth_km, wind_gust_kmh, rainfall_mm, water_level_cm, burned_area_ha
) VALUES
  ('seed-evt-101', 'flood', '2026-05-10 08:30:00', 'кв. Аспарухово — ниски части', 'Varna', 'средни', '4ч', 'high', 'active', 'Повишено ниво на вода; ограничен достъп по улици.',
    NULL, NULL, NULL, 62, 85, NULL),
  ('seed-evt-102', 'fire', '2026-05-10 11:15:00', 'крайморска зона', 'Burgas', 'високи', 'в развитие', 'critical', 'active', 'Дим и силен вятър; следвайте указанията на службите.',
    NULL, NULL, 48, NULL, NULL, 1240.50),
  ('seed-evt-103', 'storm', '2026-05-09 16:00:00', 'кв. Младост', 'Sofia', 'леки', '2ч', 'medium', 'active', 'Пориви и паднали клони; възможни прекъсвания на ток.',
    NULL, NULL, 95, 28, NULL, NULL),
  ('seed-evt-104', 'earthquake', '2026-05-08 09:00:00', 'район Център', 'Plovdiv', 'няма данни', 'кратко', 'low', 'contained', 'Слаб трус; без сигнали за сериозни щети.',
    3.1, 8.0, NULL, NULL, NULL, NULL),
  ('seed-eq-bg-01', 'earthquake', '2026-05-20 14:22:00', 'Черноморие — Кранево (северно от Варна)', 'Varna', 'M 3.4', 'секунди', 'low', 'active', 'Слаб локален трус (пример).',
    3.4, 10.5, NULL, NULL, NULL, NULL),
  ('seed-eq-bg-02', 'earthquake', '2026-05-19 08:15:00', 'Родопи — Девин (южно от Пловдив)', 'Plovdiv', 'M 3.9', 'кратко', 'medium', 'active', 'Усещаемост във високите части (пример).',
    3.9, 14.2, NULL, NULL, NULL, NULL),
  ('seed-eq-bg-03', 'earthquake', '2026-05-18 21:40:00', 'Софийско поле — Божурище', 'Sofia', 'M 4.1', 'кратко', 'medium', 'contained', 'Лек трус в околностите на София (пример).',
    4.1, 9.8, NULL, NULL, NULL, NULL),
  ('seed-eq-bg-04', 'earthquake', '2026-05-17 06:05:00', 'Странджа — Малко Търново', 'Burgas', 'M 3.1', 'секунди', 'low', 'resolved', 'Много слаб трус (пример).',
    3.1, 6.5, NULL, NULL, NULL, NULL)
AS seed
ON DUPLICATE KEY UPDATE
  type = seed.type, time = seed.time, place = seed.place, region = seed.region,
  damage = seed.damage, duration = seed.duration, level = seed.level, status = seed.status, notes = seed.notes,
  richter = seed.richter, focal_depth_km = seed.focal_depth_km, wind_gust_kmh = seed.wind_gust_kmh,
  rainfall_mm = seed.rainfall_mm, water_level_cm = seed.water_level_cm, burned_area_ha = seed.burned_area_ha;

-- ========== alerts ==========
INSERT INTO alerts (id, time, region, type, level, title, body, status) VALUES
  ('seed-al-201', '2026-05-10 12:00:00', 'Varna', 'flood', 'high', 'Внимание: риск от наводнение', 'Избягвайте ниските части. Не преминавайте през вода.', 'sent'),
  ('seed-al-202', '2026-05-10 12:05:00', 'Burgas', 'fire', 'critical', 'Критично: пожар', 'Следвайте инструкциите за евакуация при подаден сигнал.', 'sent'),
  ('seed-al-203', '2026-05-10 12:10:00', 'all', 'storm', 'medium', 'Инфо: силен вятър', 'Възможни локални проблеми по пътищата и тока.', 'sent'),
  ('seed-al-204', '2026-05-11 08:00:00', 'Sofia', 'other', 'low', 'План за безопасност', 'Проверете фенер, вода и списък с контакти у дома.', 'scheduled')
AS seed
ON DUPLICATE KEY UPDATE
  time = seed.time, region = seed.region, type = seed.type, level = seed.level,
  title = seed.title, body = seed.body, status = seed.status;

-- ========== regions ==========
INSERT INTO regions (id, city, category, name, note) VALUES
  ('seed-r-301', 'Varna', 'affected', 'кв. Аспарухово — ниски части', 'Риск от заливане при обилни валежи.'),
  ('seed-r-302', 'Burgas', 'risk', 'Крайморска зона', 'Риск от бързо разпространение при пориви и дим.'),
  ('seed-r-303', 'Sofia', 'safe', 'Парк — открита зона (пример)', 'Възможен сборен пункт при евакуация (пример).'),
  ('seed-r-304', 'Plovdiv', 'shelter', 'Спортна зала (пример)', 'Временно настаняване при нужда (пример).')
AS seed
ON DUPLICATE KEY UPDATE
  city = seed.city, category = seed.category, name = seed.name, note = seed.note;

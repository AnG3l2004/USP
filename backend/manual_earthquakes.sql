-- Ръчно добавяне на земетресения (и ползване на колоните за физически параметри).
-- ПЪРВО пусни migration_disaster_metrics.sql ако таблицата disasters е създадена преди това.
--
-- Параметри:
--   richter           — магнитуда (скала на Рихтер / локална ML)
--   focal_depth_km    — дълбочина на хипоцентъра (km)
--   wind_gust_kmh     — за бури: пориви (km/h)
--   rainfall_mm       — валеж 24h (mm) — буря / наводнение
--   water_level_cm    — за наводнение: наднормено ниво (cm)
--   burned_area_ha    — за пожар: площ (ha)
--
-- type = earthquake, region ∈ Sofia|Varna|Plovdiv|Burgas, level = low|medium|high|critical

USE alertix;

INSERT INTO disasters (
  id, type, time, place, region, damage, duration, level, status, notes,
  richter, focal_depth_km, wind_gust_kmh, rainfall_mm, water_level_cm, burned_area_ha
) VALUES
  ('manual-eq-01', 'earthquake', '2026-05-22 09:15:00', 'Софийско поле — Божурище', 'Sofia', 'M 3.2', 'секунди', 'low', 'active', 'Слаб трус; усещаемост локална.',
    3.2, 9.5, NULL, NULL, NULL, NULL),
  ('manual-eq-02', 'earthquake', '2026-05-21 18:40:00', 'Родопи — Чепеларе (южно)', 'Plovdiv', 'M 4.0', 'кратко', 'medium', 'active', 'Средна усещаемост в планински райони.',
    4.0, 12.0, NULL, NULL, NULL, NULL),
  ('manual-eq-03', 'earthquake', '2026-05-21 11:05:00', 'Черноморие — Кранево', 'Varna', 'M 4.6', '~20 сек', 'high', 'contained', 'По-силен трус край брега; следете официални съобщения.',
    4.6, 18.4, NULL, NULL, NULL, NULL),
  ('manual-eq-04', 'earthquake', '2026-05-20 22:30:00', 'Странджа — Малко Търново', 'Burgas', 'M 5.1', '~35 сек', 'critical', 'active', 'Силен трус; учебен пример за критично ниво.',
    5.1, 11.2, NULL, NULL, NULL, NULL),
  ('manual-eq-05', 'earthquake', '2026-05-19 14:00:00', 'Тракия — Асеновград', 'Plovdiv', 'M 3.7', 'кратко', 'medium', 'resolved', 'Архивен запис.',
    3.7, 7.0, NULL, NULL, NULL, NULL),
  ('manual-eq-06', 'earthquake', '2026-05-18 07:20:00', 'Северозапад — Монтана (зона София)', 'Sofia', 'M 2.9', 'секунди', 'low', 'resolved', 'Много слаб трус.',
    2.9, 5.0, NULL, NULL, NULL, NULL)
ON DUPLICATE KEY UPDATE
  type = VALUES(type),
  time = VALUES(time),
  place = VALUES(place),
  region = VALUES(region),
  damage = VALUES(damage),
  duration = VALUES(duration),
  level = VALUES(level),
  status = VALUES(status),
  notes = VALUES(notes),
  richter = VALUES(richter),
  focal_depth_km = VALUES(focal_depth_km),
  wind_gust_kmh = VALUES(wind_gust_kmh),
  rainfall_mm = VALUES(rainfall_mm),
  water_level_cm = VALUES(water_level_cm),
  burned_area_ha = VALUES(burned_area_ha);

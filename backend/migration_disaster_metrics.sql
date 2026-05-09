-- Добавя реалистични физически параметри към disasters (пусни веднъж в alertix).
-- Земетресение: richter (магнитуда по скала на Рихтер/ML), focal_depth_km
-- Буря: wind_gust_kmh, rainfall_mm
-- Наводнение: water_level_cm (наднормено ниво), rainfall_mm
-- Пожар: burned_area_ha

USE alertix;

ALTER TABLE disasters
  ADD COLUMN richter DECIMAL(4,1) NULL COMMENT 'магнитуда (Рихтер/ML)' AFTER notes,
  ADD COLUMN focal_depth_km DECIMAL(6,1) NULL COMMENT 'дълбочина хипоцентър km' AFTER richter,
  ADD COLUMN wind_gust_kmh SMALLINT UNSIGNED NULL COMMENT 'макс. пориви km/h' AFTER focal_depth_km,
  ADD COLUMN rainfall_mm SMALLINT UNSIGNED NULL COMMENT 'валеж 24h mm' AFTER wind_gust_kmh,
  ADD COLUMN water_level_cm INT NULL COMMENT 'наднормено ниво вода cm' AFTER rainfall_mm,
  ADD COLUMN burned_area_ha DECIMAL(12,2) NULL COMMENT 'площ пожар ha' AFTER water_level_cm;

-- Почистване на очевидни тестови/празни бедствия (пусни в Workbench след преглед).
-- Стъпка 1: виж какво ще изчезне:
-- SELECT id, type, place, damage, notes, time FROM disasters
-- WHERE CHAR_LENGTH(TRIM(COALESCE(place,''))) < 2
--    OR TRIM(place) REGEXP '^[[:space:]:\\.\\-_0-9]{1,8}$'
--    OR LOWER(TRIM(place)) IN ('test','тест','1','2','aa','аа','хфхф','хгф','x')
--    OR LOWER(TRIM(COALESCE(damage,''))) IN ('хфхф','хгф')
--    OR LOWER(CONCAT(COALESCE(place,''),' ',COALESCE(notes,''))) REGEXP 'тест|test|qwerty'
--    OR TRIM(place) LIKE '%:::%';

USE alertix;

DELETE FROM disasters
WHERE
  CHAR_LENGTH(TRIM(COALESCE(place, ''))) < 2
  OR TRIM(place) REGEXP '^[[:space:]:\\.\\-_0-9]{1,8}$'
  OR LOWER(TRIM(place)) IN ('test', 'тест', '1', '2', 'aa', 'аа', 'хфхф', 'хгф', 'x')
  OR LOWER(TRIM(COALESCE(damage, ''))) IN ('хфхф', 'хгф')
  OR LOWER(CONCAT(COALESCE(place, ''), ' ', COALESCE(notes, ''))) REGEXP 'тест|test|qwerty'
  OR TRIM(place) LIKE '%:::%';

CREATE TABLE clicks
(
    id    SERIAL PRIMARY KEY,
    count INT
);

INSERT INTO clicks (count)
SELECT 0
FROM generate_series(1, 10);
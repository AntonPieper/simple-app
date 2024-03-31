-- Create the table only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'clicks') THEN
        CREATE TABLE public.clicks (id SERIAL PRIMARY KEY, count INT);
    END IF;
END $$;

-- Insert data only if the table is empty
DO $$
BEGIN
    IF (SELECT COUNT(*) FROM public.clicks) = 0 THEN
        INSERT INTO public.clicks (count)
        SELECT 0
        FROM generate_series(1, 10);
    END IF;
END $$;

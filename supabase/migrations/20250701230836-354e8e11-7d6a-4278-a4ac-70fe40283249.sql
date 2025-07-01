
-- הסרת האילוץ הייחודי הקיים על slug
ALTER TABLE published_pages 
DROP CONSTRAINT IF EXISTS unique_user_slug;

-- הוספת עמודת slugID שתכיל את הדומיין המלא + slug
ALTER TABLE published_pages 
ADD COLUMN slug_id TEXT GENERATED ALWAYS AS (
  CASE 
    WHEN custom_domain IS NOT NULL AND custom_domain != '' 
    THEN custom_domain || '/' || slug
    ELSE 'html-to-site.lovable.app/' || slug
  END
) STORED;

-- יצירת אילוץ ייחודי על העמודה החדשה slugID
ALTER TABLE published_pages 
ADD CONSTRAINT unique_slug_id 
UNIQUE (slug_id);

-- יצירת אינדקס על העמודה החדשה לשיפור ביצועים
CREATE INDEX IF NOT EXISTS idx_published_pages_slug_id ON published_pages(slug_id);

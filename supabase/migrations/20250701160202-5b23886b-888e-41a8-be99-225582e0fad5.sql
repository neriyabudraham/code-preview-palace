
-- עדכון מדיניות הגישה לטבלת published_pages
-- הסרת המדיניות הישנה והוספת מדיניות חדשה ברורה יותר

-- הסרת מדיניות ישנה
DROP POLICY IF EXISTS "Anonymous users can create published pages" ON published_pages;
DROP POLICY IF EXISTS "Anonymous users can update their published pages" ON published_pages;
DROP POLICY IF EXISTS "Users can manage their own published pages" ON published_pages;

-- הוספת מדיניות חדשה - מאפשרת למשתמשים מחוברים לנהל רק את הדפים שלהם
CREATE POLICY "Authenticated users can insert their own pages" 
  ON published_pages 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authenticated users can update their own pages" 
  ON published_pages 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can delete their own pages" 
  ON published_pages 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- הוספת אינדקס לשיפור ביצועים
CREATE INDEX IF NOT EXISTS idx_published_pages_user_id ON published_pages(user_id);
CREATE INDEX IF NOT EXISTS idx_published_pages_slug ON published_pages(slug);

-- הוספת בדיקה שהסלאג ייחודי לכל משתמש
ALTER TABLE published_pages 
ADD CONSTRAINT unique_user_slug 
UNIQUE (user_id, slug);

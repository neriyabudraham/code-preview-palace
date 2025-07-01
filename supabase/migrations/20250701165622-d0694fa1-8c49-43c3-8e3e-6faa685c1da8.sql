
-- הוספת מדיניות INSERT לטבלת profiles
-- זה יאפשר למשתמשים מחוברים ליצור את הפרופיל שלהם
CREATE POLICY "Users can insert their own profile" 
  ON public.profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- עדכון מדיניות UPDATE קיימת לוודא שהיא עובדת כהלכה
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" 
  ON public.profiles 
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

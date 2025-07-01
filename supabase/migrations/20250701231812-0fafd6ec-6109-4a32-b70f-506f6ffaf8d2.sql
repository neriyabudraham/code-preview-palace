
-- יצירת טבלה לשמירת פרויקטים וטיוטות
CREATE TABLE public.user_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  project_id TEXT NOT NULL, -- מזהה הפרויקט המקומי
  name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  is_draft BOOLEAN NOT NULL DEFAULT false, -- סימון אם זה טיוטה
  is_published BOOLEAN NOT NULL DEFAULT false, -- סימון אם זה פורסם
  published_page_id UUID REFERENCES public.published_pages(id), -- קישור לדף מפורסם אם קיים
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- יצירת אינדקס על user_id ו-project_id לביצועים טובים יותר
CREATE INDEX idx_user_projects_user_id ON public.user_projects(user_id);
CREATE INDEX idx_user_projects_project_id ON public.user_projects(project_id);
CREATE INDEX idx_user_projects_user_project ON public.user_projects(user_id, project_id);

-- הוספת RLS (Row Level Security) להבטיח שמשתמשים יכולים לגשת רק לפרויקטים שלהם
ALTER TABLE public.user_projects ENABLE ROW LEVEL SECURITY;

-- מדיניות שמאפשרת למשתמשים לראות את הפרויקטים שלהם
CREATE POLICY "Users can view their own projects" 
  ON public.user_projects 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- מדיניות שמאפשרת למשתמשים ליצור פרויקטים חדשים
CREATE POLICY "Users can create their own projects" 
  ON public.user_projects 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- מדיניות שמאפשרת למשתמשים לעדכן את הפרויקטים שלהם
CREATE POLICY "Users can update their own projects" 
  ON public.user_projects 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- מדיניות שמאפשרת למשתמשים למחוק את הפרויקטים שלהם
CREATE POLICY "Users can delete their own projects" 
  ON public.user_projects 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- יצירת פונקציה לעדכון אוטומטי של updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- יצירת טריגר לעדכון אוטומטי של updated_at
CREATE TRIGGER update_user_projects_updated_at 
  BEFORE UPDATE ON public.user_projects 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

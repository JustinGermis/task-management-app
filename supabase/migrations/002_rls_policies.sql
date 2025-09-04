-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Helper functions for RLS
CREATE OR REPLACE FUNCTION public.get_user_organizations(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT organization_id 
    FROM public.organization_members 
    WHERE organization_members.user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_projects(user_id UUID)
RETURNS SETOF UUID AS $$
BEGIN
    RETURN QUERY
    SELECT project_id 
    FROM public.project_members 
    WHERE project_members.user_id = $1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_org_admin(user_id UUID, org_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.organization_members 
        WHERE organization_members.user_id = $1 
        AND organization_members.organization_id = $2 
        AND organization_members.role IN ('admin', 'manager')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_project_member(user_id UUID, proj_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.project_members 
        WHERE project_members.user_id = $1 
        AND project_members.project_id = $2
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles policies
CREATE POLICY "Users can view any profile" 
    ON public.profiles FOR SELECT 
    USING (true);

CREATE POLICY "Users can update own profile" 
    ON public.profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Organizations policies
CREATE POLICY "Organization members can view their organizations" 
    ON public.organizations FOR SELECT 
    USING (id IN (SELECT get_user_organizations(auth.uid())));

CREATE POLICY "Admins can create organizations" 
    ON public.organizations FOR INSERT 
    WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Organization admins can update their organizations" 
    ON public.organizations FOR UPDATE 
    USING (is_org_admin(auth.uid(), id));

CREATE POLICY "Organization admins can delete their organizations" 
    ON public.organizations FOR DELETE 
    USING (is_org_admin(auth.uid(), id));

-- Organization members policies
CREATE POLICY "Organization members can view members of their organizations" 
    ON public.organization_members FOR SELECT 
    USING (organization_id IN (SELECT get_user_organizations(auth.uid())));

CREATE POLICY "Organization admins can manage members" 
    ON public.organization_members FOR INSERT 
    WITH CHECK (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Organization admins can update members" 
    ON public.organization_members FOR UPDATE 
    USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Organization admins can remove members" 
    ON public.organization_members FOR DELETE 
    USING (is_org_admin(auth.uid(), organization_id));

-- Projects policies
CREATE POLICY "Users can view projects they are members of" 
    ON public.projects FOR SELECT 
    USING (
        id IN (SELECT get_user_projects(auth.uid()))
        OR organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Organization members can create projects" 
    ON public.projects FOR INSERT 
    WITH CHECK (
        organization_id IN (SELECT get_user_organizations(auth.uid()))
    );

CREATE POLICY "Project managers can update projects" 
    ON public.projects FOR UPDATE 
    USING (
        is_org_admin(auth.uid(), organization_id)
        OR EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

CREATE POLICY "Organization admins can delete projects" 
    ON public.projects FOR DELETE 
    USING (is_org_admin(auth.uid(), organization_id));

-- Project members policies
CREATE POLICY "Project members can view other members" 
    ON public.project_members FOR SELECT 
    USING (project_id IN (SELECT get_user_projects(auth.uid())));

CREATE POLICY "Project managers can add members" 
    ON public.project_members FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
            AND (
                is_org_admin(auth.uid(), p.organization_id)
                OR EXISTS (
                    SELECT 1 FROM public.project_members pm
                    WHERE pm.project_id = project_id
                    AND pm.user_id = auth.uid()
                    AND pm.role IN ('admin', 'manager')
                )
            )
        )
    );

CREATE POLICY "Project managers can update members" 
    ON public.project_members FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
            AND (
                is_org_admin(auth.uid(), p.organization_id)
                OR EXISTS (
                    SELECT 1 FROM public.project_members pm
                    WHERE pm.project_id = project_id
                    AND pm.user_id = auth.uid()
                    AND pm.role IN ('admin', 'manager')
                )
            )
        )
    );

CREATE POLICY "Project managers can remove members" 
    ON public.project_members FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = project_id
            AND (
                is_org_admin(auth.uid(), p.organization_id)
                OR EXISTS (
                    SELECT 1 FROM public.project_members pm
                    WHERE pm.project_id = project_id
                    AND pm.user_id = auth.uid()
                    AND pm.role IN ('admin', 'manager')
                )
            )
        )
    );

-- Tasks policies
CREATE POLICY "Project members can view tasks" 
    ON public.tasks FOR SELECT 
    USING (is_project_member(auth.uid(), project_id));

CREATE POLICY "Project members can create tasks" 
    ON public.tasks FOR INSERT 
    WITH CHECK (is_project_member(auth.uid(), project_id));

CREATE POLICY "Task assignees and creators can update tasks" 
    ON public.tasks FOR UPDATE 
    USING (
        is_project_member(auth.uid(), project_id)
        AND (
            created_by = auth.uid()
            OR EXISTS (
                SELECT 1 FROM public.task_assignees 
                WHERE task_id = id AND user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM public.project_members 
                WHERE project_id = tasks.project_id 
                AND user_id = auth.uid() 
                AND role IN ('admin', 'manager')
            )
        )
    );

CREATE POLICY "Project managers can delete tasks" 
    ON public.tasks FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.project_members 
            WHERE project_id = tasks.project_id 
            AND user_id = auth.uid() 
            AND role IN ('admin', 'manager')
        )
    );

-- Task assignees policies
CREATE POLICY "Project members can view task assignees" 
    ON public.task_assignees FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Project members can assign tasks" 
    ON public.task_assignees FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Project members can update assignments" 
    ON public.task_assignees FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Project members can remove assignments" 
    ON public.task_assignees FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

-- Task dependencies policies
CREATE POLICY "Project members can view dependencies" 
    ON public.task_dependencies FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Project members can create dependencies" 
    ON public.task_dependencies FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Project members can delete dependencies" 
    ON public.task_dependencies FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

-- Labels policies
CREATE POLICY "Organization members can view labels" 
    ON public.labels FOR SELECT 
    USING (organization_id IN (SELECT get_user_organizations(auth.uid())));

CREATE POLICY "Organization members can create labels" 
    ON public.labels FOR INSERT 
    WITH CHECK (organization_id IN (SELECT get_user_organizations(auth.uid())));

CREATE POLICY "Organization admins can update labels" 
    ON public.labels FOR UPDATE 
    USING (is_org_admin(auth.uid(), organization_id));

CREATE POLICY "Organization admins can delete labels" 
    ON public.labels FOR DELETE 
    USING (is_org_admin(auth.uid(), organization_id));

-- Task labels policies
CREATE POLICY "Project members can view task labels" 
    ON public.task_labels FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Project members can add labels to tasks" 
    ON public.task_labels FOR INSERT 
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Project members can remove labels from tasks" 
    ON public.task_labels FOR DELETE 
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

-- Comments policies
CREATE POLICY "Project members can view comments" 
    ON public.comments FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Project members can create comments" 
    ON public.comments FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Comment authors can update their comments" 
    ON public.comments FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Comment authors can delete their comments" 
    ON public.comments FOR DELETE 
    USING (auth.uid() = user_id);

-- Attachments policies
CREATE POLICY "Project members can view attachments" 
    ON public.attachments FOR SELECT 
    USING (
        (task_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        ))
        OR
        (comment_id IS NOT NULL AND EXISTS (
            SELECT 1 FROM public.comments c
            JOIN public.tasks t ON t.id = c.task_id
            WHERE c.id = comment_id
            AND is_project_member(auth.uid(), t.project_id)
        ))
    );

CREATE POLICY "Project members can upload attachments" 
    ON public.attachments FOR INSERT 
    WITH CHECK (
        auth.uid() = uploaded_by
        AND (
            (task_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.tasks t
                WHERE t.id = task_id
                AND is_project_member(auth.uid(), t.project_id)
            ))
            OR
            (comment_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.comments c
                JOIN public.tasks t ON t.id = c.task_id
                WHERE c.id = comment_id
                AND is_project_member(auth.uid(), t.project_id)
            ))
        )
    );

CREATE POLICY "Attachment uploaders can delete their attachments" 
    ON public.attachments FOR DELETE 
    USING (auth.uid() = uploaded_by);

-- Notifications policies
CREATE POLICY "Users can view their own notifications" 
    ON public.notifications FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications for users" 
    ON public.notifications FOR INSERT 
    WITH CHECK (true);

CREATE POLICY "Users can update their own notifications" 
    ON public.notifications FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications" 
    ON public.notifications FOR DELETE 
    USING (auth.uid() = user_id);

-- Activity logs policies
CREATE POLICY "Organization members can view activity logs" 
    ON public.activity_logs FOR SELECT 
    USING (organization_id IN (SELECT get_user_organizations(auth.uid())));

CREATE POLICY "System can create activity logs" 
    ON public.activity_logs FOR INSERT 
    WITH CHECK (true);

-- Time entries policies
CREATE POLICY "Project members can view time entries" 
    ON public.time_entries FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Users can create their own time entries" 
    ON public.time_entries FOR INSERT 
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.tasks t
            WHERE t.id = task_id
            AND is_project_member(auth.uid(), t.project_id)
        )
    );

CREATE POLICY "Users can update their own time entries" 
    ON public.time_entries FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own time entries" 
    ON public.time_entries FOR DELETE 
    USING (auth.uid() = user_id);
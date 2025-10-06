-- Seed script for Strideshift organization dummy users
-- Note: This uses direct profile inserts. In production, users would be created through auth flow.

DO $$
DECLARE
  org_id uuid;
  existing_user_id uuid;
BEGIN
  -- Get or create Strideshift organization
  SELECT id INTO org_id FROM organizations WHERE name = 'Strideshift';
  
  IF org_id IS NULL THEN
    INSERT INTO organizations (name, description) 
    VALUES ('Strideshift', 'Digital transformation and software development company')
    RETURNING id INTO org_id;
  END IF;

  -- Core Strideshift Team Members
  
  -- Kiyasha - Product Manager / Business Analyst
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'kiyasha@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES 
    ('b1111111-1111-1111-1111-111111111111'::uuid, 'kiyasha@strideshift.com', 'Kiyasha Naidoo', 'Senior Product Manager', 'Product', 
     ARRAY['product-strategy', 'business-analysis', 'agile', 'user-research', 'stakeholder-management', 'roadmapping'], 
     'Experienced product manager with a strong background in business analysis and digital transformation. Expert in translating business needs into technical requirements.',
     'manager', 'Africa/Johannesburg', 'available', 
     '{"product-strategy": 9, "business-analysis": 9, "agile": 8, "user-research": 8, "stakeholder-management": 9, "roadmapping": 8}'::jsonb, 40);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'b1111111-1111-1111-1111-111111111111'::uuid, 'manager');
  END IF;

  -- Fanyana - Senior Developer
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'fanyana@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES
    ('b2222222-2222-2222-2222-222222222222'::uuid, 'fanyana@strideshift.com', 'Fanyana Dlamini', 'Senior Full Stack Developer', 'Engineering',
     ARRAY['javascript', 'typescript', 'react', 'nodejs', 'python', 'aws', 'docker'],
     'Full stack developer with expertise in modern web technologies and cloud infrastructure. Passionate about clean code and scalable architectures.',
     'member', 'Africa/Johannesburg', 'available',
     '{"javascript": 9, "typescript": 8, "react": 9, "nodejs": 8, "python": 7, "aws": 7, "docker": 7}'::jsonb, 40);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'b2222222-2222-2222-2222-222222222222'::uuid, 'member');
  END IF;

  -- Johannes - Backend Developer / DevOps
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'johannes@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES
    ('b3333333-3333-3333-3333-333333333333'::uuid, 'johannes@strideshift.com', 'Johannes van der Merwe', 'Senior Backend Engineer', 'Engineering',
     ARRAY['java', 'spring-boot', 'postgresql', 'mongodb', 'kubernetes', 'ci-cd', 'microservices'],
     'Backend engineer specializing in Java and microservices architecture. Strong DevOps skills with experience in container orchestration.',
     'member', 'Africa/Johannesburg', 'available',
     '{"java": 9, "spring-boot": 9, "postgresql": 8, "mongodb": 7, "kubernetes": 7, "ci-cd": 8, "microservices": 8}'::jsonb, 40);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'b3333333-3333-3333-3333-333333333333'::uuid, 'member');
  END IF;

  -- Lynne - UX/UI Designer
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'lynne@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES
    ('b4444444-4444-4444-4444-444444444444'::uuid, 'lynne@strideshift.com', 'Lynne Peterson', 'Lead UX/UI Designer', 'Design',
     ARRAY['figma', 'sketch', 'adobe-xd', 'ux-research', 'prototyping', 'design-systems', 'user-testing'],
     'Creative UX/UI designer with a passion for user-centered design. Experienced in building design systems and conducting user research.',
     'manager', 'Africa/Johannesburg', 'available',
     '{"figma": 9, "sketch": 8, "adobe-xd": 7, "ux-research": 9, "prototyping": 8, "design-systems": 8, "user-testing": 8}'::jsonb, 35);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'b4444444-4444-4444-4444-444444444444'::uuid, 'manager');
  END IF;

  -- Additional Team Members
  
  -- Thabo - Mobile Developer
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'thabo@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES
    ('b5555555-5555-5555-5555-555555555555'::uuid, 'thabo@strideshift.com', 'Thabo Mokoena', 'Mobile Developer', 'Engineering',
     ARRAY['react-native', 'flutter', 'ios', 'android', 'typescript', 'mobile-testing'],
     'Mobile developer specializing in cross-platform development. Experienced with both React Native and Flutter.',
     'member', 'Africa/Johannesburg', 'available',
     '{"react-native": 8, "flutter": 7, "ios": 7, "android": 7, "typescript": 7, "mobile-testing": 6}'::jsonb, 40);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'b5555555-5555-5555-5555-555555555555'::uuid, 'member');
  END IF;

  -- Priya - QA Engineer
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'priya@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES
    ('b6666666-6666-6666-6666-666666666666'::uuid, 'priya@strideshift.com', 'Priya Reddy', 'Senior QA Engineer', 'Quality Assurance',
     ARRAY['testing', 'automation', 'selenium', 'cypress', 'api-testing', 'performance-testing', 'security-testing'],
     'QA engineer with strong automation skills. Passionate about quality and security in software development.',
     'member', 'Africa/Johannesburg', 'available',
     '{"testing": 9, "automation": 8, "selenium": 8, "cypress": 7, "api-testing": 8, "performance-testing": 7, "security-testing": 6}'::jsonb, 40);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'b6666666-6666-6666-6666-666666666666'::uuid, 'member');
  END IF;

  -- Carlos - Data Engineer
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'carlos@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES
    ('b7777777-7777-7777-7777-777777777777'::uuid, 'carlos@strideshift.com', 'Carlos Mendez', 'Data Engineer', 'Data',
     ARRAY['python', 'sql', 'spark', 'airflow', 'data-pipelines', 'etl', 'big-data'],
     'Data engineer specializing in building robust data pipelines and ETL processes. Experience with big data technologies.',
     'member', 'Africa/Johannesburg', 'available',
     '{"python": 8, "sql": 9, "spark": 7, "airflow": 7, "data-pipelines": 8, "etl": 8, "big-data": 7}'::jsonb, 40);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'b7777777-7777-7777-7777-777777777777'::uuid, 'member');
  END IF;

  -- Sipho - Junior Developer
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'sipho@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES
    ('b8888888-8888-8888-8888-888888888888'::uuid, 'sipho@strideshift.com', 'Sipho Zulu', 'Junior Developer', 'Engineering',
     ARRAY['javascript', 'html', 'css', 'react', 'learning', 'git'],
     'Enthusiastic junior developer with a passion for learning. Strong foundation in web technologies and eager to grow.',
     'member', 'Africa/Johannesburg', 'available',
     '{"javascript": 6, "html": 7, "css": 7, "react": 5, "learning": 9, "git": 6}'::jsonb, 35);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'b8888888-8888-8888-8888-888888888888'::uuid, 'member');
  END IF;

  -- Amanda - Scrum Master
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'amanda@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES
    ('b9999999-9999-9999-9999-999999999999'::uuid, 'amanda@strideshift.com', 'Amanda Williams', 'Scrum Master', 'Product',
     ARRAY['agile', 'scrum', 'kanban', 'facilitation', 'coaching', 'jira', 'confluence'],
     'Certified Scrum Master with experience in agile transformation. Focused on team productivity and continuous improvement.',
     'member', 'Africa/Johannesburg', 'available',
     '{"agile": 9, "scrum": 9, "kanban": 8, "facilitation": 8, "coaching": 8, "jira": 8, "confluence": 7}'::jsonb, 35);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'b9999999-9999-9999-9999-999999999999'::uuid, 'member');
  END IF;

  -- Michael - Cloud Architect
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'michael@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES
    ('baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'michael@strideshift.com', 'Michael Chen', 'Cloud Solutions Architect', 'Infrastructure',
     ARRAY['aws', 'azure', 'gcp', 'terraform', 'cloud-architecture', 'security', 'cost-optimization'],
     'Cloud architect with multi-cloud expertise. Focused on building secure, scalable, and cost-effective cloud solutions.',
     'member', 'Africa/Johannesburg', 'busy',
     '{"aws": 9, "azure": 8, "gcp": 7, "terraform": 8, "cloud-architecture": 9, "security": 8, "cost-optimization": 8}'::jsonb, 35);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'baaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 'member');
  END IF;

  -- Rachel - Technical Writer
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'rachel@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES
    ('bbbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'rachel@strideshift.com', 'Rachel Green', 'Technical Writer', 'Documentation',
     ARRAY['technical-writing', 'documentation', 'api-documentation', 'markdown', 'content-strategy'],
     'Technical writer specializing in developer documentation and API guides. Makes complex technical concepts accessible.',
     'member', 'Africa/Johannesburg', 'available',
     '{"technical-writing": 9, "documentation": 9, "api-documentation": 8, "markdown": 8, "content-strategy": 7}'::jsonb, 35);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'bbbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid, 'member');
  END IF;

  -- Peter - Engineering Manager
  SELECT id INTO existing_user_id FROM profiles WHERE email = 'peter@strideshift.com';
  IF existing_user_id IS NULL THEN
    INSERT INTO profiles (id, email, full_name, job_title, department, expertise, bio, role, timezone, availability_status, skills_level, work_capacity) VALUES
    ('bcccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'peter@strideshift.com', 'Peter Robinson', 'Engineering Manager', 'Engineering',
     ARRAY['leadership', 'agile', 'mentoring', 'architecture', 'strategy', 'team-building'],
     'Engineering manager with 12+ years experience. Passionate about building high-performing teams and delivering quality software.',
     'admin', 'Africa/Johannesburg', 'busy',
     '{"leadership": 9, "agile": 8, "mentoring": 9, "architecture": 8, "strategy": 8, "team-building": 9}'::jsonb, 25);
     
    INSERT INTO organization_members (organization_id, user_id, role) 
    VALUES (org_id, 'bcccccccc-cccc-cccc-cccc-cccccccccccc'::uuid, 'admin');
  END IF;

END $$;

-- Verify the Strideshift team was created
SELECT 
  p.full_name,
  p.email,
  p.job_title,
  p.department,
  p.role,
  p.availability_status,
  p.work_capacity,
  p.expertise
FROM profiles p
JOIN organization_members om ON p.id = om.user_id
JOIN organizations o ON om.organization_id = o.id
WHERE o.name = 'Strideshift'
ORDER BY p.department, p.job_title;
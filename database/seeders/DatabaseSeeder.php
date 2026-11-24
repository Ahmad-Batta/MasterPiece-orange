<?php

namespace Database\Seeders;

use App\Models\Admin;
use App\Models\Category;
use App\Models\Company;
use App\Models\Job;
use App\Models\JobPost;
use App\Models\Seeker;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        Admin::query()->updateOrCreate(
            ['email' => 'admin@careerhub.com'],
            ['username' => 'CAREERhub Admin', 'role' => 'admin', 'password' => 'password'],
        );

        $categoryNames = [
            'Engineering', 'Information Technology', 'Business', 'Medicine', 'Sciences',
            'Humanities', 'Education', 'Law', 'Arts and Design', 'Agriculture',
            'Architecture', 'Social Sciences',
        ];
        $categories = collect($categoryNames)->mapWithKeys(fn (string $name) => [
            $name => Category::query()->firstOrCreate(['category_name' => $name]),
        ]);

        $companyData = [
            ['name' => 'Northstar Engineering', 'industry' => 'Engineering', 'email' => 'engineering@careerhub.com', 'location' => 'Amman'],
            ['name' => 'Olive Health Network', 'industry' => 'Medicine', 'email' => 'health@careerhub.com', 'location' => 'Amman'],
            ['name' => 'Cedar Digital', 'industry' => 'Information Technology', 'email' => 'digital@careerhub.com', 'location' => 'Irbid'],
        ];
        $companies = collect($companyData)->mapWithKeys(function (array $data): array {
            $company = Company::query()->updateOrCreate(
                ['email' => $data['email']],
                [
                    'company_name' => $data['name'],
                    'industry' => $data['industry'],
                    'description' => $data['name'].' is a sample CAREERhub employer.',
                    'location' => $data['location'],
                    'password' => 'password',
                ],
            );

            return [$data['name'] => $company];
        });

        $seekerData = [
            ['first' => 'Rana', 'last' => 'Khalil', 'email' => 'rana.khalil@careerhub.com', 'major' => 'Civil Engineering', 'category' => 'Engineering'],
            ['first' => 'Omar', 'last' => 'Nasser', 'email' => 'omar.nasser@careerhub.com', 'major' => 'Computer Science', 'category' => 'Information Technology'],
            ['first' => 'Lina', 'last' => 'Haddad', 'email' => 'lina.haddad@careerhub.com', 'major' => 'Medicine', 'category' => 'Medicine'],
        ];
        foreach ($seekerData as $data) {
            Seeker::query()->updateOrCreate(
                ['email' => $data['email']],
                [
                    'first name' => $data['first'],
                    'last name' => $data['last'],
                    'hashed password' => '',
                    'password' => 'password',
                    'headline' => $data['major'].' graduate',
                    'biography' => 'Sample seeker profile for CAREERhub.',
                    'resume url' => '',
                    'linkedIn url' => '',
                    'skills' => '[]',
                    'location' => 'Amman',
                    'major' => $data['major'],
                    'category_id' => $categories[$data['category']]->category_id,
                ],
            );
        }

        $roleData = [
            ['title' => 'Graduate Civil Engineer', 'category' => 'Engineering', 'company' => 'Northstar Engineering', 'type' => 'Full-time', 'skills' => ['AutoCAD', 'Structural Analysis']],
            ['title' => 'Software Developer', 'category' => 'Information Technology', 'company' => 'Cedar Digital', 'type' => 'Full-time', 'skills' => ['PHP', 'JavaScript', 'SQL']],
            ['title' => 'Business Analyst', 'category' => 'Business', 'company' => 'Cedar Digital', 'type' => 'Full-time', 'skills' => ['Research', 'Data Analysis']],
            ['title' => 'Clinical Research Assistant', 'category' => 'Medicine', 'company' => 'Olive Health Network', 'type' => 'Contract', 'skills' => ['Clinical Research', 'Documentation']],
            ['title' => 'Laboratory Scientist', 'category' => 'Sciences', 'company' => 'Olive Health Network', 'type' => 'Full-time', 'skills' => ['Laboratory Methods', 'Quality Control']],
            ['title' => 'Arabic Content Editor', 'category' => 'Humanities', 'company' => 'Cedar Digital', 'type' => 'Part-time', 'skills' => ['Arabic', 'Editing']],
            ['title' => 'Education Program Coordinator', 'category' => 'Education', 'company' => 'Northstar Engineering', 'type' => 'Full-time', 'skills' => ['Teaching', 'Program Planning']],
            ['title' => 'Legal Research Associate', 'category' => 'Law', 'company' => 'Cedar Digital', 'type' => 'Full-time', 'skills' => ['Legal Research', 'Writing']],
            ['title' => 'Visual Designer', 'category' => 'Arts and Design', 'company' => 'Cedar Digital', 'type' => 'Full-time', 'skills' => ['Figma', 'Visual Design']],
            ['title' => 'Agricultural Research Assistant', 'category' => 'Agriculture', 'company' => 'Northstar Engineering', 'type' => 'Contract', 'skills' => ['Field Research', 'Data Collection']],
            ['title' => 'Junior Architect', 'category' => 'Architecture', 'company' => 'Northstar Engineering', 'type' => 'Full-time', 'skills' => ['Revit', 'Design']],
            ['title' => 'Community Research Officer', 'category' => 'Social Sciences', 'company' => 'Olive Health Network', 'type' => 'Full-time', 'skills' => ['Survey Design', 'Analysis']],
        ];

        foreach ($roleData as $data) {
            $company = $companies[$data['company']];
            $category = $categories[$data['category']];
            $job = Job::query()->firstOrCreate(
                ['company_id' => $company->company_id, 'category_id' => $category->category_id, 'title' => $data['title']],
                [
                    'description' => 'Sample active role for '.$data['title'].'.',
                    'location' => $company->location,
                    'job_type' => $data['type'],
                    'required_skills' => json_encode($data['skills'], JSON_THROW_ON_ERROR),
                ],
            );

            JobPost::query()->firstOrCreate(
                ['company_id' => $company->company_id, 'title' => $data['title']],
                [
                    'content' => 'Active sample vacancy for '.$data['title'].'. Apply through CAREERhub.',
                    'post_type' => 'job',
                ],
            );
        }
    }
}

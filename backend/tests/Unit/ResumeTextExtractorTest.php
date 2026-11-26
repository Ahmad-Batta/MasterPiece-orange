<?php

namespace Tests\Unit;

use App\Services\ResumeTextExtractor;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;
use ZipArchive;

class ResumeTextExtractorTest extends TestCase
{
    public function test_it_extracts_plain_text_from_a_docx_document(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'careerhub-docx-');
        $archive = new ZipArchive;
        $this->assertSame(true, $archive->open($path, ZipArchive::CREATE | ZipArchive::OVERWRITE));
        $archive->addFromString(
            'word/document.xml',
            '<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Candidate</w:t></w:r><w:r><w:t>Applicant</w:t></w:r></w:p></w:body></w:document>',
        );
        $archive->close();

        try {
            $file = new UploadedFile($path, 'resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', null, true);
            $this->assertSame('Candidate Applicant', app(ResumeTextExtractor::class)->extract($file));
        } finally {
            @unlink($path);
        }
    }
}

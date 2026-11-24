<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use RuntimeException;
use Smalot\PdfParser\Parser;
use ZipArchive;

class ResumeTextExtractor
{
    public function extract(UploadedFile $file): string
    {
        $extension = strtolower($file->getClientOriginalExtension());

        $text = match ($extension) {
            'pdf' => (new Parser)->parseFile($file->getRealPath())->getText(),
            'docx' => $this->extractDocx($file->getRealPath()),
            default => throw new RuntimeException('Only PDF and DOCX documents are supported.'),
        };

        $text = trim(preg_replace('/\s+/u', ' ', $text) ?? '');

        if ($text === '') {
            throw new RuntimeException('No readable text was found in the uploaded resume.');
        }

        return mb_substr($text, 0, 200000);
    }

    private function extractDocx(string $path): string
    {
        $archive = new ZipArchive;
        if ($archive->open($path) !== true) {
            throw new RuntimeException('The uploaded DOCX file could not be opened.');
        }

        try {
            $xml = $archive->getFromName('word/document.xml');
        } finally {
            $archive->close();
        }

        if (! is_string($xml) || strlen($xml) > 5000000) {
            throw new RuntimeException('The uploaded DOCX document is invalid or too large to parse.');
        }

        $document = simplexml_load_string($xml, options: LIBXML_NONET | LIBXML_NOBLANKS);
        if ($document === false) {
            throw new RuntimeException('The uploaded DOCX document contains invalid XML.');
        }

        $textNodes = $document->xpath('//*[local-name()="t"]') ?: [];

        return implode(' ', array_map(static fn (\SimpleXMLElement $node): string => (string) $node, $textNodes));
    }
}

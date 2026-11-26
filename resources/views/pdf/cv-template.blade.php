<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>{{ $fullName }} - CV</title>
    <style>
        @page { size: A4 portrait; margin: 17mm 18mm 22mm 18mm; }
        * { box-sizing: border-box; }
        body { color: #000; font-family: "DejaVu Serif", serif; font-size: 9.5pt; line-height: 1.38; }
        .identity { text-align: center; margin: 0 0 18pt; }
        .name { font-size: 22pt; line-height: 1.15; font-weight: bold; margin: 0 0 8pt; }
        .contact, .social { text-align: center; font-size: 8.5pt; line-height: 1.5; }
        .contact-item { display: inline-block; margin: 0 5pt; white-space: nowrap; }
        .icon { width: 9pt; height: 9pt; vertical-align: -1.5pt; margin-right: 2pt; }
        .social { margin-top: 3pt; }
        .social a { color: #000; text-decoration: none; }
        .section { margin: 0 0 10pt; }
        .section-title { font-size: 12pt; font-weight: bold; margin: 0 0 4pt; padding-bottom: 2pt; border-bottom: 1px solid #000; }
        .summary { text-align: justify; margin: 0; }
        .education-item { margin: 0 0 4pt; }
        .education-heading { font-weight: bold; }
        ul.skills { margin: 0 0 0 15pt; padding: 0; }
        ul.skills li { margin: 0; padding-left: 1pt; }
        .entry { margin: 0 0 7pt; page-break-inside: avoid; }
        table.entry-heading { width: 100%; border-collapse: collapse; margin: 0; }
        table.entry-heading td { padding: 0; vertical-align: top; }
        td.entry-title { font-weight: bold; width: 75%; }
        td.entry-date { font-style: italic; text-align: right; white-space: nowrap; width: 25%; }
        ul.entry-bullets { list-style-type: circle; margin: 2pt 0 0 19pt; padding: 0; }
        ul.entry-bullets li { padding-left: 1pt; margin: 0; }
        .education-details { margin: 1pt 0 0; }
        a { color: #000; }
    </style>
</head>
<body>
    <header class="identity">
        <h1 class="name">{{ $fullName !== '' ? $fullName : 'Candidate' }}</h1>
        <div class="contact">
            @if(filled($cv['city']))
                <span class="contact-item">
                    <svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14s5-4.4 5-8A5 5 0 0 0 3 6c0 3.6 5 8 5 8Z" fill="none" stroke="#000" stroke-width="1.5"/><circle cx="8" cy="6" r="1.5" fill="none" stroke="#000" stroke-width="1.3"/></svg>{{ $cv['city'] }}
                </span>
            @endif
            @if(filled($email))
                <span class="contact-item">
                    <svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><rect x="1.5" y="3" width="13" height="10" rx="1" fill="none" stroke="#000" stroke-width="1.4"/><path d="m2 4 6 4.5L14 4" fill="none" stroke="#000" stroke-width="1.4"/></svg>{{ $email }}
                </span>
            @endif
            @if(filled($cv['phone']))
                <span class="contact-item">
                    <svg class="icon" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 1.8 6.2 1l1.4 3.2-1.5 1.3a10 10 0 0 0 4.4 4.4l1.3-1.5L15 9.8l-.8 2.2c-.4 1.2-1.5 1.8-2.7 1.5A12.8 12.8 0 0 1 2.5 4.5C2.2 3.3 2.8 2.2 4 1.8Z" fill="none" stroke="#000" stroke-width="1.3" stroke-linejoin="round"/></svg>{{ $cv['phone'] }}
                </span>
            @endif
        </div>
        @if(filled($cv['linkedin_url']) || filled($cv['github_url']))
            <div class="social">
                @if(filled($cv['linkedin_url']))
                    <span><a href="{{ $cv['linkedin_url'] }}">{{ preg_replace('~^https?://(www\.)?~i', '', $cv['linkedin_url']) }}</a></span>
                @endif
                @if(filled($cv['linkedin_url']) && filled($cv['github_url']))<span> &nbsp;|&nbsp; </span>@endif
                @if(filled($cv['github_url']))
                    <span><a href="{{ $cv['github_url'] }}">{{ preg_replace('~^https?://(www\.)?~i', '', $cv['github_url']) }}</a></span>
                @endif
            </div>
        @endif
    </header>

    <section class="section">
        <h2 class="section-title">Professional Summary</h2>
        <p class="summary">{{ $cv['bio'] }}</p>
    </section>

    <section class="section">
        <h2 class="section-title">Education</h2>
        @foreach($cv['education'] as $item)
            <div class="education-item">
                <span class="education-heading">{{ $item['institution'] }}</span>
                @if(filled($item['degree'])): {{ $item['degree'] }}@endif
                @if(filled($item['location'])) ({{ $item['location'] }})@endif
                @php($educationDates = trim(($item['start_date'] ?? '').' - '.($item['end_date'] ?? ''), ' -'))
                @if($educationDates !== '') <em>{{ $educationDates }}</em>@endif
                @if(filled($item['details']))<p class="education-details">{{ $item['details'] }}</p>@endif
            </div>
        @endforeach
    </section>

    <section class="section">
        <h2 class="section-title">Skills</h2>
        <ul class="skills">
            @foreach($cv['skills_grouped'] as $group)
                @if(count($group['items']) > 0)
                    <li><strong>{{ $group['category'] }}:</strong> {{ implode(', ', $group['items']) }}</li>
                @endif
            @endforeach
        </ul>
    </section>

    <section class="section">
        <h2 class="section-title">Projects and Experience</h2>
        @foreach($cv['experience'] as $item)
            @php($experienceDates = trim(($item['start_date'] ?? '').' - '.($item['end_date'] ?? ''), ' -'))
            <div class="entry">
                <table class="entry-heading"><tr>
                    <td class="entry-title">{{ $item['title'] }}@if(filled($item['organization'])) - {{ $item['organization'] }}@endif</td>
                    <td class="entry-date">{{ $experienceDates }}</td>
                </tr></table>
                @if(filled($item['location']))<div>{{ $item['location'] }}</div>@endif
                @if(count($item['bullets']) > 0)
                    <ul class="entry-bullets">@foreach($item['bullets'] as $bullet)<li>{{ $bullet }}</li>@endforeach</ul>
                @endif
            </div>
        @endforeach
        @foreach($cv['projects'] as $item)
            <div class="entry">
                <table class="entry-heading"><tr>
                    <td class="entry-title">{{ $item['title'] }}@if(filled($item['organization'])) - {{ $item['organization'] }}@endif</td>
                    <td class="entry-date">{{ $item['date_range'] }}</td>
                </tr></table>
                @if(count($item['bullets']) > 0)
                    <ul class="entry-bullets">@foreach($item['bullets'] as $bullet)<li>{{ $bullet }}</li>@endforeach</ul>
                @endif
            </div>
        @endforeach
    </section>
</body>
</html>

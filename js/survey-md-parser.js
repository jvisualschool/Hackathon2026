/**
 * survey-md-parser.js
 * data/questions.md 형식의 마크다운을 설문 문항 객체로 변환합니다.
 *
 * 지원 형식:
 * # 설문 제목
 * (인트로 문단)
 *
 * ## N. 질문 제목 [single|multi|text]
 * - 옵션1
 * - 옵션2
 * - 기타: __        <- "__" 로 끝나면 자유 서술형 "기타" 옵션으로 처리
 *
 * type=text 인 섹션은 옵션 목록 대신 설명 텍스트만 존재합니다.
 */
(function (global) {
  function parseSurveyMarkdown(mdText) {
    const lines = mdText.replace(/\r\n/g, '\n').split('\n');

    let title = '';
    let intro = [];
    const questions = [];

    let i = 0;

    // 1) 제목 (# 로 시작하는 첫 줄)
    while (i < lines.length && !lines[i].trim()) i++;
    if (i < lines.length && /^#\s+/.test(lines[i])) {
      title = lines[i].replace(/^#\s+/, '').trim();
      i++;
    }

    // 2) 인트로 (첫 ## 전까지의 텍스트)
    while (i < lines.length && !/^##\s+/.test(lines[i])) {
      const t = lines[i].trim();
      if (t) intro.push(t);
      i++;
    }

    // 3) 섹션들 (## 로 시작)
    let qIndex = 0;
    while (i < lines.length) {
      const headMatch = lines[i].match(/^##\s+(.*)$/);
      if (!headMatch) { i++; continue; }

      let headText = headMatch[1].trim();
      i++;

      // 타입 태그 추출 [single|multi|text]
      let type = 'single';
      const tagMatch = headText.match(/\[(single|multi|text)\]\s*$/i);
      if (tagMatch) {
        type = tagMatch[1].toLowerCase();
        headText = headText.slice(0, tagMatch.index).trim();
      }
      // 앞자리 번호 제거 (예: "1. ")
      const numMatch = headText.match(/^(\d+)\.\s*/);
      let displayNumber = numMatch ? parseInt(numMatch[1], 10) : null;
      if (numMatch) headText = headText.slice(numMatch[0].length).trim();

      qIndex++;
      const question = {
        id: 'q' + qIndex,
        number: displayNumber || qIndex,
        title: headText,
        type: type, // single | multi | text
        options: [],
        description: ''
      };

      const descLines = [];
      // 섹션 본문 수집 (다음 ## 전까지)
      while (i < lines.length && !/^##\s+/.test(lines[i])) {
        const raw = lines[i];
        const t = raw.trim();
        i++;
        if (!t) continue;

        const optMatch = t.match(/^-\s*(.+)$/);
        if (optMatch && type !== 'text') {
          const optText = optMatch[1].trim();
          const otherMatch = optText.match(/^(.*?):\s*_+$/);
          if (otherMatch) {
            question.options.push({
              value: 'other',
              label: otherMatch[1].trim(),
              other: true
            });
          } else {
            question.options.push({
              value: optText,
              label: optText,
              other: false
            });
          }
        } else {
          if (/^\*\*답변:?\*\*$/.test(t)) continue; // "**답변:**" 마커 제외
          descLines.push(t);
        }
      }
      question.description = descLines.join(' ');
      questions.push(question);
    }

    return { title, intro: intro.join(' '), questions };
  }

  global.SurveyMdParser = { parseSurveyMarkdown };
})(window);

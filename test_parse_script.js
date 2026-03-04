const XLSX = require('xlsx');
const workbook = XLSX.readFile('c:\\develop\\mockExam_git\\iexam\\GESP5级客观题.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet);

const questionsToInsert = jsonData.map((row) => {
    const type = row['题型'] === '多选题' ? 'multiple' : row['题型'] === '判断题' ? 'judge' : 'single';
    let rawAnswer = row['答案'] || row['Answer'] || 'A';
    let formattedAnswer = rawAnswer;
    if (type === 'multiple' && typeof rawAnswer === 'string') {
        formattedAnswer = rawAnswer.toUpperCase().replace(/\s/g, '').split('');
    } else if (type === 'judge') {
        let ansStr = String(rawAnswer).trim();
        if (ansStr === '对' || ansStr === '正确' || ansStr === 'T' || ansStr === '1' || ansStr === 'A') {
            formattedAnswer = '1';
        } else {
            formattedAnswer = '0';
        }
    } else {
        formattedAnswer = String(rawAnswer).trim();
    }

    let opts = type === 'judge' ? [
        { label: '正确', value: '1' },
        { label: '错误', value: '0' }
    ] : [
        { label: 'A', value: String(row['选项A'] || row['选项 A'] || row['A'] || '').trim() },
        { label: 'B', value: String(row['选项B'] || row['选项 B'] || row['B'] || '').trim() },
        { label: 'C', value: String(row['选项C'] || row['选项 C'] || row['C'] || '').trim() },
        { label: 'D', value: String(row['选项D'] || row['选项 D'] || row['D'] || '').trim() }
    ].filter(o => o.value);

    return {
        title: String(row['题目'] || row['Title'] || '').substring(0, 20),
        type: type,
        options: opts,
        answer: formattedAnswer,
    }
})

console.log(JSON.stringify(questionsToInsert.slice(0, 3), null, 2));
console.log(JSON.stringify(questionsToInsert.filter(q => q.type === 'judge').slice(0, 2), null, 2));

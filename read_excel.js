const XLSX = require('xlsx');
const path = require('path');

// Use relative path or correct absolute path
const filePath = path.join(__dirname, 'GESP5级客观题.xlsx');
console.log(`Reading file from: ${filePath}`);

try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    console.log(`Total rows: ${jsonData.length}`);

    // Test the parsing logic with real file
    const questionsToInsert = jsonData.slice(0, 5).map((row, index) => {
        const type = row['题型'] === '多选题' ? 'multiple' : row['题型'] === '判断题' ? 'judge' : 'single';
        let rawAnswer = row['答案'] || row['Answer'] || 'A';
        let formattedAnswer = rawAnswer;

        if (type === 'multiple') {
            // 强制转换为字符串，移除空格、中英文逗号，然后分割
            formattedAnswer = String(rawAnswer).toUpperCase().replace(/[\s,，]/g, '').split('');
        } else if (type === 'judge') {
            let ansStr = String(rawAnswer).trim().toUpperCase();
            if (['对', '正确', 'T', 'TRUE', '1', 'A', 'YES', 'Y', '√'].includes(ansStr)) {
                formattedAnswer = '1';
            } else {
                formattedAnswer = '0';
            }
        } else {
            formattedAnswer = String(rawAnswer).trim();
        }

        return {
            index: index + 1,
            original_answer: rawAnswer,
            parsed_answer: formattedAnswer,
            type: type
        };
    });

    console.log(JSON.stringify(questionsToInsert, null, 2));

} catch (error) {
    console.error("Error reading file:", error.message);
}

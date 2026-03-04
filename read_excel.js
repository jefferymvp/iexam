const XLSX = require('xlsx');
const workbook = XLSX.readFile('c:\\develop\\mockExam_git\\iexam\\GESP5级客观题.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const jsonData = XLSX.utils.sheet_to_json(worksheet);
console.log(jsonData[0]);

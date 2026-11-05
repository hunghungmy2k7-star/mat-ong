import Papa from 'papaparse';
import { readSheet } from 'read-excel-file/browser';
import writeExcelFile from 'write-excel-file/browser';

export const FIELDS = ['word', 'ipa', 'pos', 'meaning', 'example', 'note'];
export const HEADERS = ['Từ vựng', 'Phiên âm', 'Loại từ', 'Nghĩa', 'Ví dụ', 'Ghi chú'];

// Nhận diện tiêu đề cột (tiếng Việt hoặc tiếng Anh, không phân biệt dấu/hoa thường)
const ALIASES = {
  word: ['tu vung', 'tu', 'word', 'vocabulary', 'term', 'english', 'tieng anh'],
  ipa: ['phien am', 'ipa', 'pronunciation', 'phat am'],
  pos: ['loai tu', 'pos', 'type', 'part of speech', 'tu loai'],
  meaning: ['nghia', 'meaning', 'definition', 'tieng viet', 'vietnamese', 'dich'],
  example: ['vi du', 'example', 'sentence', 'cau vi du'],
  note: ['ghi chu', 'note', 'notes', 'ghi chu mo rong'],
};
const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[*:]/g, '')
    .trim();

function detectHeader(row) {
  const map = {};
  row.forEach((cell, i) => {
    const n = norm(cell);
    for (const [field, names] of Object.entries(ALIASES)) {
      if (map[field] === undefined && names.includes(n)) map[field] = i;
    }
  });
  return map.word !== undefined && map.meaning !== undefined ? map : null;
}

function rowsToWords(rows) {
  const clean = rows.filter((r) => r && r.some((c) => String(c ?? '').trim() !== ''));
  if (!clean.length) return [];
  const header = detectHeader(clean[0]);
  // Không có tiêu đề: dùng thứ tự cột mặc định giống "Thêm nhanh": từ | phiên âm | loại từ | nghĩa | ví dụ | ghi chú
  const map = header || Object.fromEntries(FIELDS.map((f, i) => [f, i]));
  const body = header ? clean.slice(1) : clean;
  return body
    .map((r) => {
      const w = {};
      FIELDS.forEach((f) => {
        const v = map[f] !== undefined ? r[map[f]] : '';
        w[f] = v === null || v === undefined ? '' : String(v).trim();
      });
      return w;
    })
    .filter((w) => FIELDS.some((f) => w[f])); // giữ cả dòng thiếu dữ liệu để người dùng thấy và sửa
}

async function readRows(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const { data } = Papa.parse((await file.text()).replace(/^\uFEFF/, ''), { skipEmptyLines: true });
    return data;
  }
  if (name.endsWith('.xlsx')) return readSheet(file);
  throw new Error('Chỉ hỗ trợ file .csv hoặc .xlsx');
}

// File lộ trình: cột "Bộ từ" + các cột từ vựng như file thường
export async function parsePathFile(file) {
  const rows = (await readRows(file)).filter((r) => r && r.some((c) => String(c ?? '').trim() !== ''));
  if (!rows.length) return [];
  const head = rows[0].map(norm);
  const setIdx = head.findIndex((h) => ['bo tu', 'set', 'topic', 'chu de', 'bai', 'unit'].includes(h));
  if (setIdx < 0) throw new Error('File cần có cột "Bộ từ" ở dòng tiêu đề');
  const header = detectHeader(rows[0]);
  if (!header) throw new Error('File cần có cột "Từ vựng" và "Nghĩa" ở dòng tiêu đề');
  return rows.slice(1).map((r) => {
    const w = { setName: String(r[setIdx] ?? '').trim() };
    FIELDS.forEach((f) => { w[f] = header[f] !== undefined ? String(r[header[f]] ?? '').trim() : ''; });
    return w;
  }).filter((w) => w.word && w.meaning);
}

export function downloadPathTemplate() {
  const rows = [
    ['Bộ từ', ...HEADERS],
    ['Con vật', 'cat', '/kæt/', 'noun', 'con mèo', 'The cat is sleeping.', ''],
    ['Con vật', 'dog', '/dɔːɡ/', 'noun', 'con chó', 'My dog loves walks.', ''],
    ['Trường học', 'teacher', '/ˈtiː.tʃɚ/', 'noun', 'giáo viên', 'Our teacher is kind.', ''],
  ];
  download(new Blob(['\uFEFF' + Papa.unparse(rows)], { type: 'text/csv;charset=utf-8' }), 'mau-nhap-lo-trinh.csv');
}

export async function parseWordsFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = await file.text();
    const { data } = Papa.parse(text.replace(/^﻿/, ''), { skipEmptyLines: true });
    return rowsToWords(data);
  }
  if (name.endsWith('.xlsx')) {
    const data = await readSheet(file);
    return rowsToWords(data);
  }
  throw new Error('Chỉ hỗ trợ file .csv hoặc .xlsx');
}

// Thêm nhanh: mỗi dòng 1 từ, các cột cách nhau bằng dấu |
export function parseQuickText(text) {
  const rows = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.split('|').map((c) => c.trim()));
  return rowsToWords(rows);
}

const safeName = (s) => String(s || 'bo-tu').replace(/[\\/:*?"<>|]+/g, '').trim() || 'bo-tu';

function download(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportCsv(words, name) {
  const csv = Papa.unparse([HEADERS, ...words.map((w) => FIELDS.map((f) => w[f] ?? ''))]);
  download(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `${safeName(name)}.csv`);
}

export async function exportExcel(words, name) {
  const data = [
    HEADERS.map((h) => ({ value: h, fontWeight: 'bold' })),
    ...words.map((w) => FIELDS.map((f) => ({ value: w[f] ? String(w[f]) : '' }))),
  ];
  const columns = [{ width: 22 }, { width: 18 }, { width: 12 }, { width: 30 }, { width: 45 }, { width: 30 }];
  await writeExcelFile(data, { columns }).toFile(`${safeName(name)}.xlsx`);
}

export function downloadTemplate() {
  exportCsv(
    [
      { word: 'apple', ipa: '/ˈæp.əl/', pos: 'noun', meaning: 'quả táo', example: 'I eat an apple every day.', note: '' },
      { word: 'improve', ipa: '/ɪmˈpruːv/', pos: 'verb', meaning: 'cải thiện', example: 'Practice helps you improve.', note: 'đồng nghĩa: enhance' },
    ],
    'mau-nhap-tu-vung'
  );
}

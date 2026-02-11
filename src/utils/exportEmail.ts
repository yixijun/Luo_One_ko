/**
 * 邮件导出工具
 * 支持单封导出 (TXT) 和批量导出 (CSV)
 */
import type { Email } from '@/types';

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString('zh-CN');
}

function importanceLabel(imp?: string): string {
  const map: Record<string, string> = { low: '低', medium: '中', high: '高', critical: '紧急' };
  return imp ? (map[imp] || imp) : '';
}

/** 导出单封邮件为 TXT */
export function exportEmailAsTxt(email: Email) {
  const lines = [
    `主题: ${email.subject || '(无主题)'}`,
    `发件人: ${email.from}`,
    `收件人: ${email.to.join(', ')}`,
    `时间: ${formatDate(email.date)}`,
    `文件夹: ${email.folder}`,
    `已读: ${email.isRead ? '是' : '否'}`,
    `有附件: ${email.hasAttachments ? '是' : '否'}`,
  ];

  if (email.processedResult) {
    const pr = email.processedResult;
    if (pr.verificationCode) lines.push(`验证码: ${pr.verificationCode}`);
    if (pr.summary) lines.push(`摘要: ${pr.summary}`);
    if (pr.importance) lines.push(`重要度: ${importanceLabel(pr.importance)}`);
    if (pr.isAd) lines.push(`广告邮件: 是`);
  }

  lines.push('', '--- 正文 ---', '', email.body || '(无正文)');

  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
  downloadBlob(blob, `${sanitizeFilename(email.subject || '邮件')}.txt`);
}

/** 导出单封邮件为 EML 格式 (可被邮件客户端打开) */
export function exportEmailAsEml(email: Email) {
  const lines = [
    `From: ${email.from}`,
    `To: ${email.to.join(', ')}`,
    `Subject: ${email.subject}`,
    `Date: ${new Date(email.date * 1000).toUTCString()}`,
    `MIME-Version: 1.0`,
    `Content-Type: text/plain; charset=utf-8`,
    '',
    email.body || '',
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'message/rfc822' });
  downloadBlob(blob, `${sanitizeFilename(email.subject || '邮件')}.eml`);
}

/** 批量导出邮件为 CSV */
export function exportEmailsAsCsv(emailList: Email[]) {
  const header = ['ID', '主题', '发件人', '收件人', '时间', '文件夹', '已读', '有附件', '验证码', '摘要', '重要度', '广告'];
  const rows = emailList.map(e => [
    e.id,
    csvEscape(e.subject),
    csvEscape(e.from),
    csvEscape(e.to.join('; ')),
    formatDate(e.date),
    e.folder,
    e.isRead ? '是' : '否',
    e.hasAttachments ? '是' : '否',
    csvEscape(e.processedResult?.verificationCode || ''),
    csvEscape(e.processedResult?.summary || ''),
    importanceLabel(e.processedResult?.importance),
    e.processedResult?.isAd ? '是' : '',
  ]);

  // BOM for Excel to recognize UTF-8
  const bom = '\uFEFF';
  const csv = bom + [header.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `邮件导出_${new Date().toISOString().slice(0, 10)}.csv`);
}

/** 批量导出邮件为 JSON */
export function exportEmailsAsJson(emailList: Email[]) {
  const data = emailList.map(e => ({
    id: e.id,
    subject: e.subject,
    from: e.from,
    to: e.to,
    date: formatDate(e.date),
    folder: e.folder,
    isRead: e.isRead,
    hasAttachments: e.hasAttachments,
    body: e.body,
    verificationCode: e.processedResult?.verificationCode || null,
    summary: e.processedResult?.summary || null,
    importance: e.processedResult?.importance || null,
    isAd: e.processedResult?.isAd || false,
  }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  downloadBlob(blob, `邮件导出_${new Date().toISOString().slice(0, 10)}.json`);
}

function csvEscape(str: string): string {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '_').slice(0, 60);
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

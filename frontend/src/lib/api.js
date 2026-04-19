const BASE = import.meta.env.VITE_API_URL || ''

async function req(method, path, body, headers = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || 'Request failed')
  return data
}

export const api = {
  teacherLogin: (teacherCode, password) =>
    req('POST', '/api/auth/teacher/login', { teacherCode, password }),

  studentLogin: (teacherCode, studentIdentifier, studentPassword, byName = false) =>
    req('POST', '/api/auth/student/login', {
      teacherCode,
      ...(byName ? { studentName: studentIdentifier } : { studentCode: studentIdentifier }),
      studentPassword,
    }),

  getClass: (teacherCode, teacherKey) =>
    req('GET', `/api/class/${teacherCode}`, null, { 'x-teacher-key': teacherKey }),

  inviteStudent: (teacherCode, teacherKey, studentName) =>
    req('POST', '/api/teacher/student/invite', { teacherCode, teacherKey, studentName }),

  syncProgress: (teacherCode, studentCode, payload) =>
    req('POST', '/api/student/sync', { teacherCode, studentCode, ...payload }),

  generateQuiz: (params) =>
    req('POST', '/api/generate', params),

  generatePaper: (params) =>
    req('POST', '/api/paper', params),

  adminLogin: (password) =>
    req('POST', '/api/auth/admin/login', { password }),

  adminGetTeachers: (secret) =>
    req('GET', '/api/admin/teachers', null, { 'x-admin-secret': secret }),

  adminCreateTeacher: (secret, payload) =>
    req('POST', '/api/admin/teacher/create', payload, { 'x-admin-secret': secret }),

  adminDeleteTeacher: (secret, code) =>
    req('DELETE', `/api/admin/teacher/${code}`, null, { 'x-admin-secret': secret }),

  adminGetUsage: (secret) =>
    req('GET', '/api/usage', null, { 'x-admin-secret': secret }),

  adminSuspendTeacher: (secret, code, suspended) =>
    req('PATCH', `/api/admin/teacher/${code}/status`, { suspended }, { 'x-admin-secret': secret }),

  adminDeleteStudent: (secret, teacherCode, studentCode) =>
    req('DELETE', `/api/admin/teacher/${teacherCode}/student/${studentCode}`, null, { 'x-admin-secret': secret }),

  adminSuspendStudent: (secret, teacherCode, studentCode, suspended) =>
    req('PATCH', `/api/admin/teacher/${teacherCode}/student/${studentCode}/status`, { suspended }, { 'x-admin-secret': secret }),

  deleteStudent: (teacherCode, teacherKey, studentCode) =>
    req('DELETE', `/api/teacher/student/${studentCode}`, { teacherCode, teacherKey }),

  suspendStudent: (teacherCode, teacherKey, studentCode, suspended) =>
    req('PATCH', `/api/teacher/student/${studentCode}/status`, { teacherCode, teacherKey, suspended }),

  assignQuiz: (teacherCode, teacherKey, payload) =>
    req('POST', '/api/teacher/quiz/assign', { teacherCode, teacherKey, ...payload }),

  getActiveQuiz: (teacherCode) =>
    req('GET', `/api/student/quiz/active?teacherCode=${teacherCode}`),

  submitAssignedQuiz: (teacherCode, studentCode, quizId, answers) =>
    req('POST', '/api/student/quiz/submit', { teacherCode, studentCode, quizId, answers }),
}

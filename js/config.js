// 프론트엔드 설정
// API URL은 환경별로 다를 수 있어 별도 분리.

// 운영(Cloud Run) API URL. 백엔드 배포 후 받은 URL로 교체.
// 비어 있으면 "AI 추천 더 받기" 버튼 숨김.
export const API_URL =
  (typeof window !== 'undefined' && window.NAMING_LAB_API_URL) ||
  ''; // 예: 'https://naming-lab-api-360236514121.asia-northeast3.run.app'

export function aiEnabled() {
  return !!API_URL;
}

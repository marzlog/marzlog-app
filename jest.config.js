/** 순수 TS 함수 전용 Jest 설정 — RN/Expo 컴포넌트 테스트는 범위 외 (P2 ⑨ 별건) */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  // .tsx 컴포넌트 테스트는 의도적으로 제외 (jest-expo 도입 시 확장)
};

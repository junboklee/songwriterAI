export const ko = {
  common: {
    brand: 'Nova Singer AI',
    loadingSession: '세션을 확인하는 중입니다...',
    cancel: '취소',
    saveChanges: '변경 사항 저장',
    saving: '저장 중...',
    submit: '제출',
    submitting: '처리 중...',
    delete: '삭제',
    close: '닫기'
  },
  authLayout: {
    defaultHeroLabel: '사람 같은 AI와 함께 새로운 대화를 시작해 보세요.',
    termsText: '계속 진행하면 개인정보 처리방침과 이용 약관에 동의하는 것입니다.',
    footer: {
      company: '회사 소개',
      careers: '채용',
      security: '보안 센터',
      blog: '블로그',
      cookies: '쿠키 정책',
      privacy: '개인정보 처리방침',
      terms: '이용 약관'
    }
  },
  auth: {
    login: {
      title: 'YEON:VERSE',
      subtitle: '안녕하세요. 저와 함께 새로운 이야기를 시작해 볼까요?',
      registerCta: '회원가입',
      loginCta: '로그인',
      googleContinue: 'Google로 계속',
      googleLoading: 'Google 로그인 중...',
      appleContinue: 'Apple로 계속',
      appleLoading: 'Apple 로그인 중...',
      divider: '또는',
      emailLabel: '이메일',
      passwordLabel: '비밀번호',
      emailContinue: '이메일로 계속',
      emailLoading: '로그인 중...',
      audioOn: '배경음 끄기',
      audioOff: '배경음 켜기',
      errors: {
        default: '예상치 못한 오류가 발생했습니다. 다시 시도해 주세요.',
        operationNotAllowedGoogle: '현재 프로젝트에서는 Google 로그인이 비활성화되어 있습니다.',
        operationNotAllowedApple: '현재 프로젝트에서는 Apple 로그인이 비활성화되어 있습니다.',
        userNotFound: '이메일 또는 비밀번호를 확인해 주세요.',
        wrongPassword: '이메일 또는 비밀번호를 확인해 주세요.',
        invalidCredential: '인증 정보가 만료되었습니다. 다시 로그인해 주세요.'
      }
    },
    register: {
      title: 'YEON:VERSE',
      subtitle: '10분 만에 감성적인 도버스와 함께 나만의 이야기를 만들어 보세요.',
      dashboardCta: '대시보드로 돌아가기',
      loginCta: '로그인',
      audioOn: '배경음 끄기',
      audioOff: '배경음 켜기',
      googleContinue: 'Google로 계속',
      googleLoading: 'Google 가입 중...',
      appleContinue: 'Apple로 계속',
      appleLoading: 'Apple 가입 중...',
      divider: '또는',
      nicknameLabel: '표시 이름 (선택)',
      nicknamePlaceholder: '커뮤니티에서 사용할 이름을 입력해 주세요.',
      emailLabel: '이메일',
      passwordLabel: '비밀번호',
      passwordHelp: '최소 6자 이상 입력해 주세요.',
      emailContinue: '이메일로 계속',
      emailLoading: '가입 중...',
      errors: {
        default: '예상치 못한 오류가 발생했습니다. 다시 시도해 주세요.',
        emailInUse: '이미 사용 중인 이메일입니다. 로그인을 진행해 주세요.',
        weakPassword: '더 강력한 비밀번호를 입력해 주세요 (최소 6자 이상).',
        operationNotAllowedGoogle: '현재 프로젝트에서는 Google 로그인이 비활성화되어 있습니다.',
        operationNotAllowedApple: '현재 프로젝트에서는 Apple 로그인이 비활성화되어 있습니다.'
      }
    }
  },
  characterEditor: {
    title: '캐릭터 설정',
    submit: '캐릭터 저장',
    submitting: '저장 중...',
    visibility: {
      private: '비공개',
      unlisted: '링크로 공유',
      public: '전체 공개'
    },
    labels: {
      name: '캐릭터 이름 *',
      summary: '짧은 소개',
      greeting: '첫 인사 (선택)',
      longDescription: '상세 설명',
      instructions: 'AI 지침 미리보기',
      categories: '카테고리',
      visibility: '공개 범위'
    },
    placeholders: {
      name: '예) 김다연',
      summary: '어떤 분위기의 캐릭터인지 간단히 적어 주세요.',
      greeting: '사용자와 처음 만났을 때 전할 인사말을 적어 주세요.',
      longDescription: '캐릭터가 지켜야 할 말투, 행동, 규칙 등을 구체적으로 작성해 주세요.',
      categoryInput: '태그를 추가하려면 Enter를 누르세요...'
    },
    hints: {
      longDescription: '예: 차분한 말투로 위로해 주고, 음악 작업 아이디어를 제안해 줘.',
      instructions: '입력한 정보로 자동 생성된 지침입니다.'
    },
    categoryTagRemove: '태그 제거',
    closePanel: '패널 닫기',
    form: {
      avatar: '아바타 이미지',
      avatarUpload: '이미지 선택',
      avatarReset: '이미지 제거'
    },
    errors: {
      avatarType: 'PNG, JPG, WEBP 형식의 이미지만 업로드할 수 있습니다.',
      avatarSize: '이미지 용량은 2MB 이하여야 합니다.'
    }
  },
  rateLimiter: {
    exceeded: '요청 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
  },
  characterCreate: {
    pageTitle: '캐릭터 만들기',
    saveSuccess: '캐릭터가 성공적으로 생성되었습니다.',
    sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
    missingName: '캐릭터 이름은 필수입니다.',
    missingGreeting: '인사말은 필수입니다.',
    error: '알 수 없는 오류가 발생했습니다. 다시 시도해 주세요.',
    sidebarBack: '대시보드로 돌아가기',
    sidebarCancel: '작업 취소',
    form: {
      heroTitle: '새로운 캐릭터를 만들어 보세요',
      description: '말투, 분위기, 역할을 정의해 나만의 캐릭터를 구성할 수 있어요.',
      name: '캐릭터 이름 *',
      greeting: '첫 인사 (선택)',
      shortDescription: '짧은 소개',
      longDescription: '상세 설명',
      categories: '카테고리',
      visibility: '공개 설정',
      avatar: '아바타 이미지',
      avatarUpload: '이미지 선택',
      avatarReset: '이미지 제거',
      namePlaceholder: '예) 김다연',
      greetingPlaceholder: '안녕하세요! 저는 김다연이에요. 만나서 반가워요!',
      shortDescriptionPlaceholder: '캐릭터를 한 줄로 소개해 주세요.',
      longDescriptionPlaceholder: '캐릭터의 배경, 말투, 역할을 자세히 적어 주세요.',
      categoryPlaceholder: '태그를 추가하려면 Enter를 누르세요...',
      submit: '캐릭터 생성',
      submitting: '생성 중...',
      greetingCount: '{{count}} / 2048',
      longDescriptionCount: '{{count}} / 4096'
    },
    visibilityOptions: {
      public: {
        title: '공개',
        description: '누구나 캐릭터와 채팅할 수 있습니다.'
      },
      unlisted: {
        title: '링크로 공유',
        description: '링크를 통해 다른 사람들과 채팅할 수 있습니다.'
      },
      private: {
        title: '비공개',
        description: '나만 캐릭터와 채팅할 수 있습니다.'
      }
    },
    errors: {
      avatarType: 'PNG, JPG, WEBP 형식의 이미지만 업로드할 수 있습니다.',
      avatarSize: '이미지 용량은 2MB 이하여야 합니다.'
    }
  },
  characterEdit: {
    pageTitle: '캐릭터 편집',
    saveSuccess: '캐릭터가 성공적으로 수정되었습니다.',
    sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.',
    loadError: '캐릭터 정보를 불러오지 못했습니다.',
    missingName: '캐릭터 이름은 필수입니다.',
    missingGreeting: '인사말은 필수입니다.',
    errors: {
      avatarType: 'PNG, JPG, WEBP 형식의 이미지만 업로드할 수 있습니다.',
      avatarSize: '이미지 용량은 2MB 이하여야 합니다.'
    }
  },
  sidebar: {
    nav: {
      chat: {
        label: '라이브 채팅',
        description: '캐릭터와 실시간으로 대화하기'
      },
      history: {
        label: '대화 기록',
        description: '지난 세션 되돌아보기'
      },
      suno: {
        label: '라이브러리',
        description: '저장된 가사와 프롬프트'
      }
    }
  },
  shareModal: {
    close: '닫기',
    download: '이미지 다운로드',
    downloading: '이미지 생성 중...'
  },
  shareCard: {
    badge: '라이브러리',
    promptTitle: '프롬프트',
    lyricsTitle: '가사',
    dateUnknown: '날짜 정보 없음',
    lyricsEmpty: '가사가 비어 있어요.',
    promptEmpty: '프롬프트가 비어 있어요.',
    characterTag: '캐릭터 {{id}}',
    originalTag: '원본 작업',
    threadLabel: 'Thread {{id}}',
    untitled: '제목 미정'
  },
  suno: {
    title: '라이브러리',
    subtitle: 'Suno AI에서 만든 가사와 프롬프트를 한 곳에 모아보세요.',
    actions: {
      liveChat: '라이브 채팅',
      history: '대화 기록'
    },
    status: {
      loading: '저장된 곡을 불러오는 중입니다...',
      error: '저장된 곡을 불러오지 못했습니다.',
      empty: '아직 저장된 Suno AI 곡이 없습니다. 새 트랙을 만들어 보세요.',
      deleteError: '곡을 삭제하지 못했습니다.',
      loadMore: '더 불러오기',
      loadingMore: '불러오는 중...'
    },
    form: {
      titleLabel: '제목 (선택)',
      titlePlaceholder: '곡 제목을 입력하세요.',
      promptLabel: '프롬프트 (선택)',
      promptPlaceholder: '프롬프트를 입력하세요.',
      lyricsLabel: '가사',
      lyricsPlaceholder: '가사를 입력하세요.',
      lyricsRequired: '가사를 입력해 주세요.',
      save: '노래 저장',
      saving: '저장 중...',
      success: '노래를 저장했습니다.',
      error: '노래를 저장하지 못했습니다.',
      sessionExpired: '세션이 만료되었습니다. 다시 로그인해 주세요.'
    },
    bulk: {
      selectedCount: '선택된 항목: {{count}}개',
      deleteSelected: '선택 삭제',
      deleteAll: '전체 삭제',
      deleteSelectedConfirm: '선택한 {{count}}개 항목을 삭제할까요?',
      deleteAllConfirm: '저장된 모든 곡을 삭제할까요?',
      deleting: '삭제 중...'
    },
    card: {
      untitled: '제목 미정',
      prompt: '프롬프트',
      lyrics: '가사',
      metadata: '메타데이터',
      noLyrics: '(가사가 비어 있어요)',
      copy: '복사하기',
      copied: '복사 완료',
      selectLabel: '이 곡 선택',
      characterBadge: '캐릭터 {{id}}',
      thread: 'thread: {{id}}'
    },
    share: {
      title: '카드 공유',
      close: '닫기',
      download: '이미지 다운로드',
      downloading: '이미지 생성 중...'
    }
  },
  chat: {
    status: {
      ready: '{{name}}와(과) 새로운 대화를 시작해 볼까요?',
      assistantTyping: '{{name}}가 응답을 준비하고 있어요...',
      userTyping: '입력 중이에요...'
    },
    typingIndicator: {
      assistant: '응답 작성 중',
      user: '입력 중'
    },
    inputPlaceholder: '생각을 공유하거나 롤플레이를 시작해 보세요...',
    send: '보내기'
  }
};

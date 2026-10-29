export const en = {
  common: {
    brand: 'NovaSingerAI',
    loadingSession: 'Checking your session...',
    cancel: 'Cancel',
    saveChanges: 'Save changes',
    saving: 'Saving...',
    submit: 'Submit',
    submitting: 'Processing...',
    delete: 'Delete',
    close: 'Close'
  },
  authLayout: {
    defaultHeroLabel: 'Tell your story and Dayeon, an AI singer-songwriter, turns it into song lyrics.',
    termsPrefix: 'By continuing you agree to the ',
    termsAnd: ' and the ',
    termsSuffix: '. You must be 19 or older (Korean age of majority) to sign up.',
    footer: {
      home: 'Home',
      pricing: 'Pricing',
      privacy: 'Privacy Policy',
      terms: 'Terms of Use'
    }
  },
  auth: {
    login: {
      title: 'NovaSingerAI',
      subtitle: 'Welcome back. Pick up the lyrics you were writing with Dayeon.',
      registerCta: 'Sign up',
      loginCta: 'Log in',
      googleContinue: 'Continue with Google',
      googleLoading: 'Signing in with Google...',
      appleContinue: 'Continue with Apple',
      appleLoading: 'Signing in with Apple...',
      divider: 'or',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      emailContinue: 'Continue with email',
      emailLoading: 'Signing in...',
      audioOn: 'Mute ambience',
      audioOff: 'Play ambience',
      errors: {
        default: 'Something went wrong. Please try again.',
        operationNotAllowedGoogle:
          'Google sign-in is disabled for this project right now.',
        operationNotAllowedApple:
          'Apple sign-in is disabled for this project right now.',
        userNotFound: 'Check your email and password.',
        wrongPassword: 'Check your email and password.',
        invalidCredential: 'Your credentials expired. Please sign in again.'
      }
    },
    register: {
      birthLabel: 'Date of birth, 8 digits (required)',
      birthPlaceholder: 'e.g. 19950315',
      birthHelp: 'You must be 19 or older. Your date of birth is only used for this check and is not stored.',
      birthInvalid: 'Please enter a valid date of birth.',
      underAge: 'Sorry, you must be 19 or older to sign up.',
      title: 'NovaSingerAI',
      subtitle: 'Turn your story into song lyrics by chatting with Dayeon. Signing up is free.',
      tryCta: 'Try it',
      loginCta: 'Log in',
      audioOn: 'Mute ambience',
      audioOff: 'Play ambience',
      googleContinue: 'Continue with Google',
      googleLoading: 'Creating Google account...',
      appleContinue: 'Continue with Apple',
      appleLoading: 'Creating Apple account...',
      divider: 'or',
      nicknameLabel: 'Display name (optional)',
      nicknamePlaceholder: 'Enter the name the community should see.',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      passwordHelp: 'Use at least 6 characters.',
      emailContinue: 'Continue with email',
      emailLoading: 'Signing up...',
      errors: {
        default: 'Something went wrong. Please try again.',
        emailInUse: 'That email is already registered. Try signing in instead.',
        weakPassword: 'Use a stronger password (at least 6 characters).',
        operationNotAllowedGoogle:
          'Google sign-in is disabled for this project right now.',
        operationNotAllowedApple:
          'Apple sign-in is disabled for this project right now.'
      }
    }
  },
  characterEditor: {
    title: 'Character settings',
    submit: 'Save character',
    submitting: 'Saving...',
    visibility: {
      private: 'Private',
      unlisted: 'Share via link',
      public: 'Public'
    },
    labels: {
      name: 'Character name *',
      summary: 'Short bio',
      greeting: 'First greeting (optional)',
      longDescription: 'Detailed description',
      instructions: 'AI instructions preview',
      categories: 'Categories',
      visibility: 'Visibility',
      gender: 'Gender'
    },
    genderOptions: {
      male: 'Male',
      female: 'Female',
      none: 'No gender'
    },
    placeholders: {
      name: 'e.g. Dayeon Kim',
      summary: 'Briefly describe the character’s vibe.',
      greeting: 'Write how the character greets the user.',
      longDescription:
        'Spell out tone, behavior, and rules the character must follow.',
      categoryInput: 'Press Enter to add a tag...'
    },
    hints: {
      longDescription: 'Ex: Speak gently, comfort the user, and suggest songwriting ideas.',
      instructions: 'These guidelines are generated from the information above.'
    },
    categoryTagRemove: 'Remove tag',
    closePanel: 'Close panel',
    form: {
      avatar: 'Avatar image',
      avatarUpload: 'Choose image',
      avatarReset: 'Remove image'
    },
    errors: {
      avatarType: 'Only PNG, JPG, or WEBP images are supported.',
      avatarSize: 'Image size must be 2MB or smaller.'
    }
  },
  rateLimiter: {
    exceeded: 'You hit the request limit. Please try again shortly.'
  },
  characterCreate: {
    pageTitle: 'Create character',
    saveSuccess: 'Character created successfully.',
    sessionExpired: 'Session expired. Please log in again.',
    missingName: 'Character name is required.',
    missingGreeting: 'Greeting is required.',
    error: 'Something went wrong. Please try again.',
    sidebarBack: 'Dashboard',
    sidebarCancel: 'Cancel',
    form: {
      heroTitle: 'Build a brand-new character',
      heroEyebrow: 'Persona Studio',
      description: 'Define tone, mood, and role to shape your own persona.',
      highlights: {
        persona: 'Shape emotions, tone, and cadence with intent.',
        mood: 'Use one-line prompts to anchor the scene and mood.',
        sharing: 'Share publicly so the community can meet your persona.'
      },
      cardEyebrow: 'Creative Capsule',
      cardTitle: 'Design Notes',
      cardSubtitle: 'Clear intent and emotional cues lead to richer replies.',
      cardStat1: 'Required steps',
      cardStat2: 'Avg build time',
      cardStatValue1: '4 steps',
      cardStatValue2: '≈5 min',
      name: 'Character name *',
      genderLabel: 'Gender',
      genderOptions: {
        male: 'Male',
        female: 'Female',
        none: 'No gender'
      },
      greeting: 'First greeting (optional)',
      shortDescription: 'Short bio',
      longDescription: 'Detailed description',
      categories: 'Categories',
      visibility: 'Visibility',
      avatar: 'Avatar image',
      avatarUpload: 'Choose image',
      avatarReset: 'Remove image',
      namePlaceholder: 'e.g. Dayeon Kim',
      greetingPlaceholder: "Hi! I'm Dayeon. Nice to meet you!",
      shortDescriptionPlaceholder: 'Introduce the character in one line.',
      longDescriptionPlaceholder:
        'Describe the background, tone, and responsibilities.',
      categoryPlaceholder: 'Press Enter to add a tag...',
      categoryRemove: 'Remove tag',
      submit: 'Create character',
      submitting: 'Creating...',
      greetingCount: '{{count}} / 2048',
      longDescriptionCount: '{{count}} / 4096',
      tips: {
        personaTitle: 'Persona details',
        personaBody: 'Describe origin, relationships, and sample phrases for an immersive tone.',
        visibilityTitle: 'Visibility guide',
        visibilityBody: 'Choose public to let the community discover and chat with your persona.'
      },
      sections: {
        identityTitle: 'Persona basics',
        identitySubtitle: 'Define greetings and traits so the tone feels consistent.',
        storyTitle: 'Storyline',
        storySubtitle: 'Capture the character’s background and behavioral rules here.',
        avatarTitle: 'Avatar & tags',
        avatarSubtitle: 'Use imagery and category tags to hint at the character’s world.',
        visibilityTitle: 'Visibility',
        visibilitySubtitle: 'Pick how your persona can be discovered and shared.'
      }
    },
    visibilityOptions: {
      public: {
        title: 'Public',
        description: 'Anyone can chat with this character.'
      },
      unlisted: {
        title: 'Shareable link',
        description: 'Only people with the link can chat with this character.'
      },
      private: {
        title: 'Private',
        description: 'Only you can chat with this character.'
      }
    },
    errors: {
      avatarType: 'Only PNG, JPG, or WEBP images are supported.',
      avatarSize: 'Image size must be 2MB or smaller.'
    }
  },
  characterEdit: {
    pageTitle: 'Edit character',
    saveSuccess: 'Character updated successfully.',
    sessionExpired: 'Session expired. Please log in again.',
    loadError: 'Failed to load character info.',
    missingName: 'Character name is required.',
    missingGreeting: 'Greeting is required.',
    errors: {
      avatarType: 'Only PNG, JPG, or WEBP images are supported.',
      avatarSize: 'Image size must be 2MB or smaller.'
    }
  },
  sidebar: {
    nav: {
      chat: {
        label: 'Live chat',
        description: 'Talk with a persona in real time'
      },
      history: {
        label: 'Conversation history',
        description: 'Revisit past sessions'
      },
      suno: {
        label: 'Library',
        description: 'Saved lyrics and prompts'
      },
      explore: {
        label: 'Character market',
        description: 'Browse public characters'
      },
      dashboard: {
        label: 'Dashboard',
        description: 'See everything at a glance'
      }
    },
    create: {
      label: 'Create character',
      description: 'Design a brand-new persona'
    }
  },
  shareModal: {
    close: 'Close',
    download: 'Download image',
    downloading: 'Rendering image...'
  },
  shareCard: {
    badge: 'Library',
    promptTitle: 'Prompt',
    lyricsTitle: 'Lyrics',
    dateUnknown: 'No date',
    lyricsEmpty: 'Lyrics are empty.',
    promptEmpty: 'Prompt is empty.',
    characterTag: 'Character {{id}}',
    originalTag: 'Original work',
    threadLabel: 'Thread {{id}}',
    untitled: 'Untitled'
  },
  explore: {
    title: 'Character market',
    subtitle: 'Find songwriting personas shared by other creators and start writing with them.',
    searchPlaceholder: 'Search by name, description or tag',
    allCategories: 'All categories',
    sortRecent: 'Newest',
    sortPopular: 'Popular',
    loading: 'Loading characters...',
    error: 'Could not load characters.',
    empty: 'No characters match these filters.',
    loadMore: 'Load more',
    startChat: 'Start chat',
    like: 'Like',
    unlike: 'Unlike',
    loginToLike: 'Log in to like characters.',
    chats: '{{count}} chats',
    report: 'Report',
    reportTitle: 'Report character',
    reportReason: 'Reason',
    reportDetail: 'Details (optional)',
    reportSubmit: 'Submit report',
    reportCancel: 'Cancel',
    reportDone: 'Thanks, we received your report and will review it.',
    reportError: 'Could not submit the report.',
    reasons: {
      inappropriate: 'Inappropriate or offensive content',
      copyright: 'Copyright infringement or impersonation',
      spam: 'Spam or advertising',
      other: 'Other'
    }
  },
  ageGate: {
    title: 'Please confirm your date of birth',
    body: 'NovaSingerAI is for people aged 19 or older. Enter your date of birth to continue.',
    birthLabel: 'Date of birth (8 digits)',
    birthPlaceholder: 'e.g. 19950315',
    submit: 'Confirm',
    checking: 'Checking...',
    privacyHint: 'Your date of birth is only used for this check and is not stored.',
    error: 'Could not confirm. Please try again shortly.',
    underAgeTitle: 'Available from age 19',
    underAgeBody: 'Sorry, NovaSingerAI is only for people aged 19 or older. Please come back when you turn 19. You can delete your account and everything saved in it now if you like.',
    underAgeNotice: 'From {{date}} only people aged 19 or older can use the service. Copy any lyrics you need before then; you can delete your account from the dashboard.',
    deleteAccount: 'Delete account',
    deleteConfirm: 'Chats, lyrics and characters will all be deleted permanently. Delete?',
    deleteYes: 'Delete',
    deleting: 'Deleting...',
    deleteError: 'Could not delete the account. Please try again shortly.',
    cancel: 'Cancel',
    retry: 'Enter date of birth again',
    terms: 'Terms',
    logout: 'Log out',
    noticeLabel: 'Age policy change',
    notice: 'From {{date}} NovaSingerAI is for people aged 19 or older. Please confirm your date of birth.',
    noticeAction: 'Confirm date of birth'
  },
  songEditor: {
    title: 'Edit lyrics',
    close: 'Close',
    audioTitle: 'Listen as a song',
    audioAiLabel: 'AI-generated voice',
    audioHint: 'AI sings the saved lyrics. A 30-second preview takes about 20 seconds, a full song about 30. (admin test)',
    audioSaveFirst: 'Songs are made from the saved lyrics. Please press "Save as new version" first.',
    audioNeedsIdentity: 'Verify your identity (19 or older) to make one free 30-second preview.',
    audioVerify: 'Verify and listen for free',
    audioFreeHint: 'AI sings the saved lyrics as a 30-second preview. One preview is free; full songs will be paid.',
    audioFreeUsed: 'You have used your free preview. More songs are coming soon.',
    audioClip: 'Make a 30-second preview',
    audioFull: 'Make the full song',
    audioBusy: 'Singing...',
    audioClipLabel: '30-second preview',
    audioFullLabel: 'Full song',
    audioPlay: 'Play',
    audioError: 'Could not load the song. Please try again shortly.',
    titleLabel: 'Title',
    styleLabel: 'Style (for music generation)',
    stylePlaceholder: 'e.g. acoustic ballad, female vocal, 75bpm',
    lyricsLabel: 'Lyrics',
    analysisToggle: 'Syllable & rhyme view',
    analysisHint: 'Numbers are syllables per line; matching dots mark lines ending on the same vowel.',
    versions: 'Version history',
    versionsLoading: 'Loading versions...',
    versionsEmpty: 'No saved versions yet.',
    compareHint: 'Select a version to compare it with the lyrics you are editing.',
    restore: 'Restore this version',
    restoreConfirm: 'Restore this version? The current text stays in the history.',
    save: 'Save as new version',
    saving: 'Saving...',
    saved: 'Saved.',
    copySuno: 'Copy for Suno',
    copyLyrics: 'Copy lyrics for Suno',
    copyStyle: 'Copy style',
    singabilityTitle: 'Singability check',
    singabilityHint: 'Checks that AI music tools (Suno etc.) can sing the Korean clearly.',
    singabilityOk: 'Nothing hard to sing was found.',
    singabilityCount: '{{count}} to check',
    singabilityLine: 'Line {{line}}',
    singabilityFix: 'Fix',
    fixAll: 'Fix {{count}} lines at once',
    fixAllHint: 'AI rewrites each line and shows the changes before applying. Uses {{count}} AI requests.',
    fixAllLimit: 'Fixes up to the first {{count}} lines at a time.',
    fixAllRunning: 'Fixing... {{done}}/{{total}} lines',
    fixAllReview: 'Fixed {{count}} lines. Issues {{before}} → {{after}}',
    fixAllPartial: '{{count}} lines could not be fixed.',
    fixAllApply: 'Apply all',
    fixAllCancel: 'Cancel',
    singability: {
      tooLong: '{{syllables}} syllables is long for one breath.',
      uneven: '{{syllables}} syllables, far from the other lines in this section (about {{target}}).',
      digits: 'Digits can be read several ways; spell them out in Korean.',
      mixedLanguage: 'Mixing Korean and English can make pronunciation unstable.',
      denseBatchim: 'Several clipped final consonants (ㄱ·ㄷ·ㅂ·ㅅ…) in a row can sound mumbled.',
      symbols: 'Emoji and symbols may be read out or dropped.',
      noSections: 'Adding section tags like [Verse] and [Chorus] keeps the song structure stable.'
    },
    singabilityRequest: {
      tooLong: '이 줄을 {{target}}음절 안팎으로 줄이거나 두 줄로 나눠줘. 뜻은 유지해줘.',
      uneven: '이 줄을 {{target}}음절 안팎으로 맞춰줘. 뜻과 분위기는 유지해줘.',
      digits: '숫자를 노래로 부르기 좋게 한글로 바꿔줘.',
      mixedLanguage: '영어 단어를 자연스러운 한국어로 바꿔줘.',
      denseBatchim: 'ㄱ·ㄷ·ㅂ·ㅅ 같은 끊기는 받침이 연달아 오지 않게 발음하기 쉬운 단어로 바꿔줘. 뜻은 유지해줘.',
      symbols: '이모지와 특수문자를 빼고 자연스럽게 다듬어줘.'
    },
    rewriteSelectHint: 'Select lines in the lyrics to rewrite just that part with AI.',
    rewriteTitle: 'Rewrite {{count}} selected lines',
    rewritePlaceholder: 'How should it change? e.g. sadder, set it in the rain',
    rewriteRun: 'Rewrite',
    rewriting: 'Writing...',
    rewriteApply: 'Apply',
    rewriteAgain: 'Try again',
    rewriteBack: 'Change request',
    rewriteHint: 'Press "Save as new version" after applying to keep it.',
    quickSadder: 'Make it sadder',
    quickRhyme: 'Make it rhyme',
    quickShorter: 'Shorter and tighter',
    quickVivid: 'More vivid imagery',
    shareTitle: 'Public link',
    shareHint: 'Anyone with the link can read the latest lyrics without signing in. Not listed in search engines.',
    shareCreate: 'Create public link',
    shareCopy: 'Copy link',
    shareRemove: 'Stop sharing',
    copied: 'Copied',
    error: 'Something went wrong. Please try again.',
    unsaved: 'You have unsaved changes. Close anyway?',
    source: {
      initial: 'First save',
      'auto-from-chat': 'Auto-saved from chat',
      manual: 'Edited',
      restore: 'Restored'
    }
  },
  suno: {
    title: 'Library',
    subtitle: 'Keep your Suno AI prompts and lyrics all in one place.',
    actions: {
      liveChat: 'Live chat',
      history: 'Conversation history'
    },
    status: {
      loading: 'Loading saved tracks...',
      error: 'Failed to load saved tracks.',
      empty: 'No saved Suno AI songs yet. Create a new track to get started.',
      deleteError: 'Failed to delete the selected tracks.',
      loadMore: 'Load more',
      loadingMore: 'Loading...'
    },
    form: {
      titleLabel: 'Title (optional)',
      titlePlaceholder: 'Enter a song title.',
      promptLabel: 'Prompt (optional)',
      promptPlaceholder: 'Enter the prompt you used.',
      lyricsLabel: 'Lyrics',
      lyricsPlaceholder: 'Type or paste the lyrics.',
      lyricsRequired: 'Please provide lyrics.',
      save: 'Save song',
      saving: 'Saving...',
      success: 'Song saved.',
      error: 'Failed to save the song.',
      sessionExpired: 'Session expired. Please log in again.'
    },
    bulk: {
      selectedCount: 'Selected: {{count}}',
      deleteSelected: 'Delete selected',
      deleteAll: 'Delete all',
      deleteSelectedConfirm: 'Delete {{count}} selected items?',
      deleteAllConfirm: 'Delete every saved song?',
      deleting: 'Deleting...'
    },
    card: {
      untitled: 'Untitled',
      prompt: 'Prompt',
      lyrics: 'Lyrics',
      style: 'Style',
      noLyrics: '(No lyrics provided)',
      copy: 'Copy',
      copied: 'Copied',
      copyFailed: 'Copy failed',
      edit: 'Edit · {{count}} versions',
      selectLabel: 'Select this song',
      fromChat: 'Saved from chat',
      openChat: 'Open chat'
    },
    share: {
      title: 'Share card',
      close: 'Close',
      download: 'Download image',
      downloading: 'Rendering image...'
    }
  },
  chat: {
    status: {
      ready: 'Ready to start a new chat with {{name}}?',
      assistantTyping: '{{name}} is getting a reply ready...',
      userTyping: 'Typing...'
    },
    typingIndicator: {
      assistant: 'Writing a reply',
      user: 'Typing'
    },
    inputPlaceholder: 'Share a thought or kick off a roleplay...',
    send: 'Send',
    quickReplies: 'Quick replies'
  },

  dashboard: {
    charactersLoadError: 'Could not load your custom characters.',
    charactersLoading: 'Loading custom characters...',
    charactersEmpty: 'You have not created any custom characters yet.',
    deleteError: 'Failed to delete that character.',
    updateError: 'Failed to update the character.',
    updatedUnknown: 'No update info',
    summaryFallback: 'This creator has not added a short bio yet.',
    instructionsFallback: 'Detailed background has not been shared yet.',
    sidebarProfileRole: 'Profile',
    defaultTag: 'Character',
    profileLoadError: 'Could not load your profile.',
    profileLoading: 'Loading profile...',
    recentChatsLoadError: 'Could not load recent conversations.',
    recentChatsEmpty: 'No recent conversations yet.',
    overviewTitle: 'Activity overview',
    conversationsLabel: 'Conversations',
    songsLabel: 'Saved lyrics',
    recentChatsTitle: 'Recent conversations',
    sidebarRecentTitle: 'Recent chats',
    sidebarEmptyRecent: 'No recent chat history.',
    continueChat: 'Continue chat',
    startChat: 'Start chat',
    edit: 'Edit',
    delete: 'Delete',
    deleting: 'Deleting...',
    visitCreate: 'Create a character',
    navDashboard: 'Dashboard',
    navHistory: 'History',
    navSuno: 'Music library',
    searchPlaceholder: 'Search',
    searchNoResults: 'No results found.',
    copyLink: 'Copy link',
    copyLinkSuccess: 'Copied!',
    welcome: 'Welcome back, {{name}}!',
    loadingIndicator: 'Loading...',
    todaysSpotlight: "Today's spotlight character",
    noMessagesYet: 'No saved messages yet.',
    deleteRecentChat: 'Delete chat',
    deletingRecentChat: 'Deleting...',
    deleteRecentChatConfirm: 'Delete this chat?',
    deleteRecentChatError: 'Failed to delete the chat.',
    clearRecentChats: 'Clear all',
    clearingRecentChats: 'Clearing...',
    clearRecentChatsConfirm: 'Delete all recent chats?',
    clearRecentChatsError: 'Failed to delete every recent chat.',
    profileMenuNickname: 'Change nickname',
    profileMenuDeleteAccount: 'Delete account',
    deleteAccountConfirm:
      'Are you sure? Conversations, characters, and songs will be permanently deleted.',
    deleteAccountError: 'Could not delete the account. Try again later.',
    deleteAccountSuccess: 'Account deleted.',
    deleteAccountInProgress: 'Deleting account...',
    profileMenuSignOut: 'Sign out',
    profileMenuLabel: 'Account menu',
    nicknameModalTitle: 'Change nickname',
    nicknameModalDescription: 'Your new display name appears across the app.',
    nicknameLabel: 'Display name',
    nicknamePlaceholder: 'e.g. Aurora Muse',
    nicknameSave: 'Save',
    nicknameSaving: 'Saving...',
    nicknameCancel: 'Cancel',
    nicknameRequired: 'Enter a display name.',
    nicknameError: 'Failed to update your display name.',
    recentChatsCount: '{{count}} messages',
    visibilityLabel: 'Visibility',
    lastUpdatedLabel: 'Updated',
    showcaseTitle: 'Show Off Custom Characters',
    showcaseSubtitle: 'Discover publicly shared personas and start chatting.',
    showcaseEmpty: 'No shared characters yet. Be the first to showcase yours!',
    showcaseLoadError: 'Failed to load shared custom characters.',
    showcaseViewAll: 'View all in the market',
    showcaseCta: 'Create a character',
    customCharactersTitle: 'Custom Characters',
    sortLabel: 'Sort order',
    sortPopularity: 'Popularity',
    sortRecent: 'Newest',
    sortGender: 'Gender'
  },
  chatPage: {
    sidebarTitle: 'Recent conversations',
    loadingTitle: 'Loading...',
    loadingDescription: 'Fetching your recent conversations.',
    errorTitle: 'Unable to load conversations',
    errorDescription: 'We could not load your recent chats.',
    emptyTitle: 'No conversations yet',
    emptyDescription: 'Send your first message to fill the list.',
    pinnedTitle: 'Roleplay prompts',
    emptyPreview: 'No recent messages.',
    sessionExpired: 'Session expired. Please log in again.',
    rateLimited: 'Request limit exceeded. Try again in a moment.',
    quickReplies: 'Quick replies',
    loadingRecent: 'Loading multiple conversations...',
    summaryFallback: 'Custom character created by this user.',
    defaultTag: 'Custom character'
  }
};

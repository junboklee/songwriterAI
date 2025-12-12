export const en = {
  common: {
    brand: 'Nova Singer AI',
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
    defaultHeroLabel: 'Start a new conversation with a lifelike AI companion.',
    termsText: 'By continuing you agree to our Privacy Policy and Terms of Use.',
    footer: {
      company: 'About',
      careers: 'Careers',
      security: 'Security Center',
      blog: 'Blog',
      cookies: 'Cookie Policy',
      privacy: 'Privacy Policy',
      terms: 'Terms of Use'
    }
  },
  auth: {
    login: {
      title: 'YEON:VERSE',
      subtitle: "Hi there. Ready to start a new story with me?",
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
      title: 'YEON:VERSE',
      subtitle: 'Craft an emotive duet with your AI copilot in under ten minutes.',
      dashboardCta: 'Dashboard',
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
      metadata: 'Metadata',
      noLyrics: '(No lyrics provided)',
      copy: 'Copy',
      copied: 'Copied',
      selectLabel: 'Select this song',
      characterBadge: 'Character {{id}}',
      thread: 'Thread {{id}}'
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
    send: 'Send'
  },

  dashboard: {
    charactersLoadError: 'Could not load your custom characters.',
    charactersLoading: 'Loading custom characters...',
    charactersEmpty: 'You have not created any custom characters yet.',
    deleteError: 'Failed to delete that character.',
    updateError: 'Failed to update the character.',
    updatedUnknown: 'No update info',
    summaryFallback: 'No bio has been written yet.',
    instructionsFallback: 'No AI instructions yet.',
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
    summaryFallback: 'Custom character created by the user.',
    defaultTag: 'Custom character'
  }
};

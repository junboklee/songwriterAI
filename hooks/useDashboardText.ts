import { useMemo } from 'react';

import { useTranslation } from '@/context/I18nContext';

// All dashboard strings resolved once per locale change.
export function useDashboardText() {
  const { t: tDashboard } = useTranslation('dashboard');

  const dashboardText = useMemo(
    () => ({
      charactersLoadError: tDashboard('charactersLoadError'),
      charactersLoading: tDashboard('charactersLoading'),
      charactersEmpty: tDashboard('charactersEmpty'),
      deleteError: tDashboard('deleteError'),
      updateError: tDashboard('updateError'),
      updatedUnknown: tDashboard('updatedUnknown'),
      summaryFallback: tDashboard('summaryFallback'),
      instructionsFallback: tDashboard('instructionsFallback'),
      sidebarProfileRole: tDashboard('sidebarProfileRole'),
      defaultTag: tDashboard('defaultTag'),
      profileLoadError: tDashboard('profileLoadError'),
      profileLoading: tDashboard('profileLoading'),
      recentChatsLoadError: tDashboard('recentChatsLoadError'),
      recentChatsEmpty: tDashboard('recentChatsEmpty'),
      overviewTitle: tDashboard('overviewTitle'),
      conversationsLabel: tDashboard('conversationsLabel'),
      songsLabel: tDashboard('songsLabel'),
      lastUpdatedLabel: tDashboard('lastUpdatedLabel'),
      showcaseTitle: tDashboard('showcaseTitle'),
      showcaseSubtitle: tDashboard('showcaseSubtitle'),
      showcaseEmpty: tDashboard('showcaseEmpty'),
      showcaseLoadError: tDashboard('showcaseLoadError'),
      showcaseViewAll: tDashboard('showcaseViewAll'),
      showcaseCta: tDashboard('showcaseCta'),
      customCharactersTitle: tDashboard('customCharactersTitle'),
      sortLabel: tDashboard('sortLabel'),
      sortPopularity: tDashboard('sortPopularity'),
      sortRecent: tDashboard('sortRecent'),
      sortGender: tDashboard('sortGender'),
      recentChatsTitle: tDashboard('recentChatsTitle'),
      sidebarRecentTitle: tDashboard('sidebarRecentTitle'),
      sidebarEmptyRecent: tDashboard('sidebarEmptyRecent'),
      continueChat: tDashboard('continueChat'),
      startChat: tDashboard('startChat'),
      edit: tDashboard('edit'),
      delete: tDashboard('delete'),
      deleting: tDashboard('deleting'),
      visitCreate: tDashboard('visitCreate'),
      navDashboard: tDashboard('navDashboard'),
      navHistory: tDashboard('navHistory'),
      navSuno: tDashboard('navSuno'),
      searchPlaceholder: tDashboard('searchPlaceholder'),
      searchNoResults: tDashboard('searchNoResults'),
      copyLink: tDashboard('copyLink'),
      copyLinkSuccess: tDashboard('copyLinkSuccess'),
      visibilityLabel: tDashboard('visibilityLabel'),
      welcome: (name?: string | null) =>
        tDashboard('welcome', { replacements: { name: name ?? '' } }),
      loadingIndicator: tDashboard('loadingIndicator'),
      todaysSpotlight: tDashboard('todaysSpotlight'),
      noMessagesYet: tDashboard('noMessagesYet'),
      deleteRecentChat: tDashboard('deleteRecentChat'),
      deletingRecentChat: tDashboard('deletingRecentChat'),
      deleteRecentChatConfirm: tDashboard('deleteRecentChatConfirm'),
      deleteRecentChatError: tDashboard('deleteRecentChatError'),
      clearRecentChats: tDashboard('clearRecentChats'),
      clearingRecentChats: tDashboard('clearingRecentChats'),
      clearRecentChatsConfirm: tDashboard('clearRecentChatsConfirm'),
      clearRecentChatsError: tDashboard('clearRecentChatsError'),
      profileMenuNickname: tDashboard('profileMenuNickname'),
      profileMenuDeleteAccount: tDashboard('profileMenuDeleteAccount'),
      deleteAccountConfirm: tDashboard('deleteAccountConfirm'),
      deleteAccountError: tDashboard('deleteAccountError'),
      deleteAccountSuccess: tDashboard('deleteAccountSuccess'),
      deleteAccountInProgress: tDashboard('deleteAccountInProgress'),
      profileMenuSignOut: tDashboard('profileMenuSignOut'),
      profileMenuLabel: tDashboard('profileMenuLabel'),
      nicknameModalTitle: tDashboard('nicknameModalTitle'),
      nicknameModalDescription: tDashboard('nicknameModalDescription'),
      nicknameLabel: tDashboard('nicknameLabel'),
      nicknamePlaceholder: tDashboard('nicknamePlaceholder'),
      nicknameSave: tDashboard('nicknameSave'),
      nicknameSaving: tDashboard('nicknameSaving'),
      nicknameCancel: tDashboard('nicknameCancel'),
      nicknameRequired: tDashboard('nicknameRequired'),
      nicknameError: tDashboard('nicknameError'),
      recentChatsCount: (count: number) =>
        tDashboard('recentChatsCount', { replacements: { count } })
    }),
    [tDashboard]
  );

  return dashboardText;
}

export type DashboardText = ReturnType<typeof useDashboardText>;

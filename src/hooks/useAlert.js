import { useState, useCallback } from 'react';

/**
 * useAlert - drop-in hook for CustomAlert
 *
 * Usage:
 *   const { alertState, showAlert, hideAlert } = useAlert();
 *
 *   showAlert({
 *     title: 'Success',
 *     message: 'Your profile has been updated!',
 *     type: 'success',
 *     buttons: [{ text: 'OK', onPress: () => hideAlert() }],
 *   });
 *
 *   <CustomAlert {...alertState} />
 */
export default function useAlert() {
  const [alertState, setAlertState] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    buttons: [],
    onDismiss: undefined,
  });

  const hideAlert = useCallback(() => {
    setAlertState(prev => ({ ...prev, visible: false }));
  }, []);

  const showAlert = useCallback(({ title, message, type = 'info', buttons = [], onDismiss }) => {
    // Auto-wrap buttons to include hideAlert
    const wrappedButtons = buttons.length > 0
      ? buttons.map(btn => ({
          ...btn,
          onPress: () => {
            hideAlert();
            if (btn.onPress) btn.onPress();
          },
        }))
      : [{ text: 'OK', onPress: hideAlert }];

    setAlertState({
      visible: true,
      title,
      message,
      type,
      buttons: wrappedButtons,
      onDismiss: onDismiss || hideAlert,
    });
  }, [hideAlert]);

  return { alertState, showAlert, hideAlert };
}

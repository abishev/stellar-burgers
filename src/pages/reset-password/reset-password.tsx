import { useFormReset } from '@/hooks/use-form-reset';
import { ResetPasswordUI } from '@ui-pages';
import {
  clearPasswordResetErrors,
  confirmPasswordReset,
  selectPasswordReset,
} from '@slices/passwordResetSlice';
import { useDispatch, useSelector } from '@services/store';
import { Preloader } from '@ui';
import { type SyntheticEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const ResetPassword = (): React.JSX.Element => {
  const dispatch = useDispatch();
  const { resetLoading, resetError } = useSelector(selectPasswordReset);
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [token, setToken] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('resetPassword')) {
      void navigate('/forgot-password', { replace: true });
    }
  }, [navigate]);

  useFormReset(() => {
    setPassword('');
    setToken('');
    dispatch(clearPasswordResetErrors());
  });

  const handleSubmit = (e: SyntheticEvent): void => {
    e.preventDefault();

    void dispatch(confirmPasswordReset({ password, token }))
      .unwrap()
      .then(() => {
        setPassword('');
        setToken('');
        localStorage.removeItem('resetPassword');
        void navigate('/login');
      })
      .catch(() => undefined);
  };

  if (resetLoading) return <Preloader />;

  return (
    <ResetPasswordUI
      errorText={resetError || undefined}
      password={password}
      token={token}
      setPassword={setPassword}
      setToken={setToken}
      handleSubmit={handleSubmit}
    />
  );
};

import { selectMember } from '@/hooks/selectors';
import { useAppSelector } from '@/store/hooks';

export const useAuth = () => {
  const member = useAppSelector(selectMember);
  
  return {
    member,
    isAuthenticated: !!member,
  };
};

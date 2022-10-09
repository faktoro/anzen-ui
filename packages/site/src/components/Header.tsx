import { ConnectButton } from '@rainbow-me/rainbowkit';
import styled from 'styled-components';
import { useAccount } from 'wagmi';
import { AccountDetails } from '../types';
import { shortenedAddress } from '../utils';
import anzenLogo from '../assets/anzen.png';

const HeaderWrapper = styled.header`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  padding: 2.4rem;
  border-bottom: 1px solid ${(props) => props.theme.colors.border.default};
`;

const Title = styled.p`
  font-size: ${(props) => props.theme.fontSizes.title};
  font-weight: bold;
  margin: 0;
  margin-left: 1.2rem;
  ${({ theme }) => theme.mediaQueries.small} {
    display: none;
  }
`;

const LogoWrapper = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

const RightContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
`;

export const Header = ({
  accountDetails,
}: {
  accountDetails: AccountDetails[];
}) => {
  const { address } = useAccount();

  const { name, avatar } = accountDetails.find(
    (acc) => acc.address === address,
  ) ?? {
    name: address ? shortenedAddress(address) : '',
    avatar: null,
  };

  return (
    <HeaderWrapper>
      <LogoWrapper>
        <img
          style={{ width: 40, height: 40, borderRadius: 6 }}
          src={anzenLogo}
        />
        <Title>Anzen</Title>
      </LogoWrapper>
      <RightContainer>
        {/* <ConnectButton accountStatus="avatar" showBalance={false} /> */}
        {address ? (
          <p
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            Connected as{' '}
            {avatar && (
              <img
                style={{
                  width: 30,
                  height: 30,
                  margin: '0 8px',
                  borderRadius: 4,
                }}
                src={avatar}
              />
            )}
            {name}
          </p>
        ) : (
          <ConnectButton />
        )}
      </RightContainer>
    </HeaderWrapper>
  );
};

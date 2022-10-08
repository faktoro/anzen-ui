import styled, { ThemeProvider } from 'styled-components';
import { Home } from './components';
import { dark, GlobalStyle } from './config/theme';
import { MetaMaskProvider } from './hooks';

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  min-height: 100vh;
  max-width: 100vw;
`;

function App() {
  return (
    <ThemeProvider theme={dark}>
      <MetaMaskProvider>
        <GlobalStyle />
        <Wrapper>
          <Home />
        </Wrapper>
      </MetaMaskProvider>
    </ThemeProvider>
  );
}

export default App;

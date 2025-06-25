import { Link } from '@tanstack/react-router';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import styles from './Home.module.css';

const Home = () => {
  return (
    <div className={styles.homeContainer}>
      <Card className={styles.welcomeCard}>
        <h1>Welcome to Thomas Baldwin Barry's Photography</h1>
        <p>Explore stunning photography galleries featuring portraits, landscapes, and artistic compositions.</p>
        <div className={styles.actionButtons}>
          <Link to='/galleries'>
            <Button
              label='View Galleries'
              icon='pi pi-images'
              className='p-button-lg'
            />
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Home;

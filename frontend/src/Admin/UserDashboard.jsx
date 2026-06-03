import NavBar from '../Components/Navbar';
// import User5DaysHistory from './User5DaysHistory';
import UserWelcome from './UserWelcome';
import UserDataTile from './UserDataTile';
import UserCalendar from './UserCalendar';
import UserExtractData from "./UserExtractData"
import AdminBar from './AdminBar'
import SessionMetrics from '../Components/SessionMetrics';
import ExpandableSessionDetails from '../Components/ExpandableSessionDetails';
import { useParams } from 'react-router-dom';

const UserDashboard = () => {
  const { employeeId } = useParams();
  return (
    <>
      <div className='w-full flex justify-end items-start'>
        <div className='w-5/6 min-h-screen flex flex-col overflow-y-auto'>
          <NavBar />
          <div className='w-full flex flex-col justify-start items-start gap-10 px-12'>
            <div className='w-full flex flex-col lg:flex-row gap-8'>
              <div className='flex-1 rounded-lg'>
                <UserWelcome employeeId={employeeId} />
                {employeeId && (
                  <SessionMetrics employeeId={employeeId} />
                )}
                <UserDataTile employeeId={employeeId} />
              </div>
              <div className='w-full lg:w-auto lg:max-w-sm'>
                <UserCalendar employeeId={employeeId} />
              </div>
            </div>
            {employeeId && (
              <UserExtractData employeeId={employeeId} />
            )}
            {employeeId && (
              <ExpandableSessionDetails employeeId={employeeId} />
            )}
            <AdminBar employeeId={employeeId} />
            {/* <div className='w-1/2'>
              <User5DaysHistory employeeId={employeeId} />
            </div> */}
          </div>
        </div>
      </div>
    </>
  )
}

export default UserDashboard
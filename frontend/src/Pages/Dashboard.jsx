import { useEffect, useState } from 'react';
import axios from 'axios';
import NavBar from '../Components/Navbar';
import WelcomeNote from '../Components/WelcomeNote';
import DataTile from '../Components/DataTile';
import CalendarComp from "../Components/CalendarComp";
import UserBar from '../Components/UserBar';
import SessionMetrics from '../Components/SessionMetrics';
import ExpandableSessionDetails from '../Components/ExpandableSessionDetails';
import { HOST } from '../utils/constants';

const Dashboard = () => {
  const [employeeId, setEmployeeId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployeeId = async () => {
      try {
        const response = await axios.get(`${HOST}/api/user/get-user-details`, {
          withCredentials: true,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        setEmployeeId(response.data.employee_id);
      } catch (error) {
        console.error("Error fetching employee details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEmployeeId();
  }, []);

  return (
    <>
      <div className='w-full flex justify-end items-start'>
        <div className='w-5/6 min-h-screen flex flex-col overflow-y-auto'>
          <NavBar />
          <div className='w-full flex flex-col justify-start items-start gap-10 px-12'>
            <div className='w-full flex flex-col lg:flex-row gap-8'>
            <div className='flex-1 rounded-lg cursor-pointer transition'>
              <WelcomeNote />
              {!loading && employeeId && (
                <SessionMetrics employeeId={employeeId} />
              )}
              <DataTile />
            </div>
            <div className='w-full lg:w-auto lg:max-w-sm'>
              <CalendarComp />
            </div>
          </div>
            {!loading && employeeId && (
              <ExpandableSessionDetails employeeId={employeeId} />
            )}
            <UserBar />
          </div>
        </div>
      </div>
    </>
  )
}

export default Dashboard
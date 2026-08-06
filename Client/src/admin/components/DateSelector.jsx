import React from 'react';
import MuiDatePicker from '../../components/MuiDatePicker';

const DateSelector = ({ value, onChange }) => {
  return (
    <MuiDatePicker value={value} onChange={onChange} label="mm-dd-yyyy" />
  );
};

export default DateSelector;
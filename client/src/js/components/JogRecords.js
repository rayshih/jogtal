import React, {Component} from 'react';
import {connect} from 'react-redux';
import moment from 'moment';
import _ from 'lodash';

import {
  Row,
  Col,
  PageHeader,
  Panel,
  Input,
  Button
} from 'react-bootstrap';

import {
  fetchAllJogRecords,
  createJogRecord,
} from '../actions';

const RecordListCell = ({record}) => {
  const d = record.distance;
  const distance = d >= 1000 ?
    (d / 1000).toFixed(2) + ' KM':
    d + ' M';

  const t = record.time;

  // TODO: refactor this
  const time = t >= 3600 ?
    Math.floor(t / 3600) + 'h' +
      Math.floor(t % 3600 / 60) + 'm' +
        Math.floor(t % 60) + 's':
    (t >= 60) ?
      Math.floor(t % 3600 / 60) + 'm' +
        Math.floor(t % 60) + 's' :
      t + 's';

  const speed = record.speed.toFixed(2);
  const pace = record.pace.toFixed(2);

  return (
    <Panel>
      <Row>
        <Col md={3}>Date: {record.date.format('YYYY/MM/DD')}</Col>
        <Col md={3}>
          <div>Distance: {distance}</div>
          <div>Average Pace: {pace} mins/KM</div>
        </Col>
        <Col md={3}>
          <div>Time: {time}</div>
          <div>Average Speed: {speed} M/s</div>
        </Col>
        <Col md={3}>Action Here</Col>
      </Row>
    </Panel>
  );
};

class JogForm extends Component {
  constructor() {
    super();
    this.state = this.initState;
  }

  // TODO default date is today
  initState = {
    date: moment(Date.now()).format('YYYY-MM-DD'),
    distance: 0,
    time: 0
  }

  createJog = () => {
    const distance = parseFloat(this.state.distance) * 1000;
    const time = parseInt(this.state.time);

    if (distance <= 0) {
      alert('distance must greater then 0');
      return;
    }

    if (time <= 0) {
      alert('time must greater then 0');
      return;
    }

    const {userId, token} = this.props.session;
    const {dispatch} = this.props;

    this.setState(this.initState);

    dispatch(createJogRecord({
      date: this.state.date,
      distance,
      time,
      userId,
      token
    }));
  }

  onFieldChange = (fieldName) => {
    return () => {
      const field = this.refs[fieldName]
      const value = field.getValue();
      this.setState({[fieldName]: value});
    }
  }

  render() {
    const wrapperStyle = {
      marginTop: '40px'
    };

    const btnStyle = {
      marginTop: '25px'
    };

    return (
      <div style={wrapperStyle}>
        <h3>Create New Records</h3>
        <Panel>
          <Row>
            <Col md={3}>
              <Input
                type="date"
                label="Date"
                value={this.state.date}
                onChange={this.onFieldChange('date')}
                ref="date"
              />
            </Col>
            <Col md={3}>
              <Input
                type="number"
                label="Distance (in KM)"
                value={this.state.distance}
                onChange={this.onFieldChange('distance')}
                ref="distance"
              />
            </Col>
            <Col md={3}>
              <Input
                type="number"
                label="Time (in seconds)"
                value={this.state.time}
                onChange={this.onFieldChange('time')}
                ref="time"
              />
            </Col>
            <Col md={3}>
              <Button
                bsStyle="primary"
                style={btnStyle}
                onClick={this.createJog}
              >Create</Button>
            </Col>
          </Row>
        </Panel>
      </div>
    );
  }
}

const WeeklyRecords = ({records, filterFrom, filterTo}) => {
  const filterFromM = filterFrom ? moment(filterFrom) : null;
  const filterToM = filterTo ? moment(filterTo) : null;

  const lastDate = records[0].date;

  const from = moment(lastDate).weekday(0).format('YYYY/MM/DD');
  const to = moment(lastDate).weekday(6).format('YYYY/MM/DD');

  const filteredData = _(records).
    filter(r => {
      if (filterFromM && r.date < filterFromM) return false;
      if (filterToM && r.date > filterToM) return false;
      return true;
    }).
    sortBy('date').
    reverse().
    value();

  const avePace = (_(records).pluck('pace').sum() / records.length).toFixed(2);
  const aveSpeed = (_(records).pluck('speed').sum() / records.length).toFixed(2);

  const style = {
    marginTop: '40px'
  };

  return (
    <div style={style}>
      <div className="pull-right">
        <span>Average Pace: {avePace} mins/KM</span>,&nbsp;
        <span>Average Speed: {aveSpeed} M/s</span>
      </div>
      <h3>{from}~{to}</h3>
      {filteredData.map(r => <RecordListCell key={r.id} record={r} />)}
    </div>
  );
};

const JogRecords = connect(
  (state) => {
    return {jogRecords: state.jogRecords};
  }
)(({jogRecords, filterFrom, filterTo}) => {

  const fromWeek = filterFrom ? moment(filterFrom).week() : null;
  const toWeek = filterTo ? moment(filterTo).week() : null;

  // TODO test it
  const data = _(jogRecords).
    map(r => {
      const date = moment(r.date);
      return Object.assign({}, r, {
        date,
        pace: (r.time / 60) / (r.distance / 1000) ,
        speed: r.distance / r.time,
        weekIndex: date.week()
      });
    }).
    filter(r => {
      if (fromWeek && r.weekIndex < fromWeek) return false;
      if (toWeek && r.weekIndex > toWeek) return false;
      return true;
    }).
    groupBy('weekIndex').
    map(list => {
      return {
        weekIndex: list[0].weekIndex,
        week: list[0].date.format('YYYY-ww'),
        records: list
      };
    }).
    sortBy('week').
    reverse().
    value();

  const list = data.
    map((recordsByWeek) => (
      <WeeklyRecords
        key={recordsByWeek.week}
        records={recordsByWeek.records}
        filterFrom={filterFrom}
        filterTo={filterTo}
      />
    ));

  return (
    <div>
      {list}
    </div>
  );
});

class JogRecordsListPage extends Component {

  componentDidMount() {
    const {userId, token} = this.props.session;
    const {dispatch} = this.props;
    dispatch(fetchAllJogRecords(userId, token));
  }

  state = {}

  filterFromChanged = () => {
    this.setState({
      filterFrom: this.refs.filterFrom.value
    });
  }

  filterToChanged = () => {
    this.setState({
      filterTo: this.refs.filterTo.value
    });
  }

  render() {
    const filterWrapperStyle = {
      top: '12px',
      position: 'relative'
    };

    return (
      <div>
        <div className="pull-right" style={filterWrapperStyle}>
          <form className="form-inline" onSubmit={(e) => e.preventDefault()}>
            Filter:&nbsp;
            <input
              className="form-control"
              type="date"
              ref="filterFrom"
              onChange={this.filterFromChanged}
            />
            &nbsp;~&nbsp;
            <input
              className="form-control"
              type="date"
              ref="filterTo"
              onChange={this.filterToChanged}
            />
          </form>
        </div>
        <PageHeader>
          Your Jogging Records
        </PageHeader>
        <JogForm
          session={this.props.session}
          dispatch={this.props.dispatch}
         />
        <JogRecords
          filterFrom={this.state.filterFrom}
          filterTo={this.state.filterTo}
        />
      </div>
    );
  }

};

const stateToProps = (state) => {
  return {
    session: state.session
  };
};

export default connect(stateToProps)(JogRecordsListPage);

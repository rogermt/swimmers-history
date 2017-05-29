import React, { Component } from 'react';
import Options from '../containers/Options';
import Summary from './Summary';
import Graph from '../containers/Graph';
import Country from '../containers/Country';

class VisComponent extends Component {
  render() {
    return (
      <div className="container">
        <div className="columns">
          <div className="column is-3">
            Swimmers' Network
          </div>
          <div className="column is-9">
            <a className="button is-small"
              onClick={this.props.toggle}>
              {this.props.isOptionOpen ? 'Hide' : 'Show'} Filtering Options
            </a>
            { this.props.isOptionOpen &&
              <Options />
            }
            { !this.props.isOptionOpen &&
              <Summary
                {...this.props.racesInfo}
                names={this.props.searchedAthletes}
              />
            }
            { this.props.visType === 'network' && <Graph/> }
            { this.props.visType === 'country' && <Country/> }
          </div>
        </div>
      </div>
    );
  }
}

export default VisComponent;

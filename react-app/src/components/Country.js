import React, { Component } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';
import Countries from '../data/countries.json';

class CountryComponent extends Component {

  drawLinear(props) {
    //data
    const { byCountry, countries } = props;
    _.each(countries, (country) => {
      //show flag
      const code = Countries[country];
      d3.select('#div-country')
        .append('span')
        .text(`${country} (${byCountry[country].length})`)
        .attr('class', `${code ? `fl-icon flag-icon-${code.toLowerCase()} ` : ' '} athlete-country`);
      _.each(byCountry[country], (a, i) => {
        const styles = a.records.map((r, j) => {
          let s = 'btw';
          if (a.records.length === 1) {
            s = 'single';
          } else if (j === 0) {
            s = 'first';
          } else if (j === a.records.length - 1) {
            s = 'last';
          }
          return s;
        });
        _.each(a.records, (r, j) => {
          const neighbor = (j > 0 && +a.records[j - 1].place < 4 && +r.place < 4) ? true : false;
          const lastA = (j === a.records.length - 1 && i === byCountry[country].length - 1) ? true : false;
          d3.select(`#div-country`)
            .append('span')
            .attr('class', `js-a-${a.id} r-general js-r-${r.race_id} r-${r.place} r-${styles[j]}${neighbor ? ' r-neighbor': ''}${lastA ? ' r-a-last' : ''}`)
            .on('mouseover', () => {
              this.props.mouseOverFunc(r.race_id, a.name);
            })
            .on('mouseout', () => {
              this.props.mouseOutFunc();
            })
            .on('click', () => {
              this.props.clickFunc(a);
            })
        })
      });
    })
  }

  updateGraph(nextProps) {
    d3.select('#div-country').html('');
    this.drawLinear(nextProps);
  }

  componentDidMount() {
    this.drawLinear(this.props);
  }

  componentWillReceiveProps(nextProps) {
    //option change
    if (this.props.countries !== nextProps.countries) {
      this.updateGraph(nextProps);
      return false;
    }
    //mouse over
    if (this.props.hovered !== nextProps.hovered) {
      d3.selectAll(`.js-r-${nextProps.raceId}`).classed('r-hover', nextProps.hovered);
      d3.select('.js-country-hover')
        .style('display', `${nextProps.hovered ? 'inline-block' : 'none'}`)
        .style('left', `${d3.event.pageX}px`)
        .style('top', `${d3.event.pageY}px`);
      d3.select('.js-hover-content').html(nextProps.hoverText);
    }
    //click
    if (nextProps.clicked || this.props !== nextProps.clicked) {
      d3.selectAll(`.js-a-${nextProps.clickedId}`)
        .classed('a-clicked', nextProps.clicked);
    }
  }

  render() {
    return (
      <div className="country" id="vis-country-width">
        <div id="div-country" className="country-linear">
        </div>
        <div className="country-hover js-country-hover">
          <div className="hover-content js-hover-content"/>
          <div className="arrow-down"/>
        </div>
      </div>
    );
  }
}

export default CountryComponent;

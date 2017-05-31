import React, { Component } from 'react';
import * as d3 from 'd3';
import _ from 'lodash';

class NetworkComponent extends Component {

  dragstarted(d, simulation) {
    if (!d3.event.active) {
      simulation.alphaTarget(0.5).restart();
    }
    d.fx = d.x;
    d.fy = d.y;
  }

  dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  dragended(d, isClicked, simulation) {
    if (!d3.event.active) {
        simulation.alphaTarget(0);
    }
    d.fx = null;
    d.fy = null;
  }

  ticked(link, node) {
    link.attr('x1', (d) => d.source.x )
      .attr('y1', (d) => d.source.y )
      .attr('x2', (d) => d.target.x )
      .attr('y2', (d) => d.target.y );
    node.attr('cx', (d) => d.x )
      .attr('cy', (d) => d.y );
  }

  drawGraph(props) {
    const { graph, pointRange } = props;
    //set the size
    const w = document.getElementById('vis-width').clientWidth;
    const dim = w * 0.6;
    d3.select('#svg').attr('height', Math.round(w * 0.8));
    let svg = d3.select('#vis-g');
    const decayRange = d3.scaleLinear().range([0.5, 1]).domain([1, 800]);
    const simulation = d3.forceSimulation()
      .force('link', d3.forceLink().id((d) => d.id)
      .distance(() => dim / 5))
      .velocityDecay(Math.max(Math.min(decayRange(graph.nodes.length), 1), 0.2))
      .force('charge', d3.forceManyBody()
        .strength( -1 * dim / 5)
        .distanceMax(dim / 3)
      )
      .force('center', d3.forceCenter(w / 2, w * 0.8 / 2));

    //link as lines
    let linkG = svg.append('g').attr('id', 'links');
    let link = linkG.selectAll('line')
        .data(graph.links)
        .enter().append('line')
        .attr('stroke-width', (d) => d.value )
        .attr('class', 'link-normal')
        .attr('id', (d) => `${_.min([d.source.id || d.source, d.target.id || d.target])}-${_.max([d.source.id || d.source, d.target.id || d.target])}`);

    //node as circles
    //set radius size (min: square root 9 = 3), point range min is 700
    let radius = d3.scaleLinear()
      .range([9, graph.nodes.length * 1.9])
      .domain(pointRange);
    let nodeG = svg.append('g').attr('id', 'nodes');
    let self = this;
    let node = nodeG.selectAll('circle')
      .data(graph.nodes)
      .enter().append('circle')
      .attr('id', (d) => d.id)
      .attr('r', (d) => {
        const points = _.map(d.records, 'point');
        const total = _.reduce(points, function (memo, num) {
            return memo + num;
        }, 0);
        return total <= 700 ? 3 : Math.sqrt(radius(total));
      })
      .attr('class', 'node-normal')
      .call(d3.drag()
        .on('start', (d) => this.dragstarted(d, simulation))
        .on('drag', this.dragged)
        .on('end', function (d) {
          return self.dragended(d, d3.select(this).attr('clicked'), simulation);
        }))
      .on('mouseover', (d) => {
        if ('ontouchstart' in document) {
          return false;
        }
        this.props.mouseOverFunc(d);
      })
      .on('mouseout', (d) => this.props.mouseOutFunc())
      .on('click', (d) => this.props.clickFunc(d));
    simulation.nodes(graph.nodes).on('tick', () => this.ticked(link, node));
    simulation.force('link').links(graph.links);
  }

  updateGraph(nextProps) {
    d3.select('#links').remove();
    d3.select('#nodes').remove();
    this.drawGraph(nextProps);
  }

  highlightElements(props, status) {
    //filter all linked nodes
    d3.selectAll('circle')
      .filter((d) => _.includes(props.mutualLinkedNodes, d.id))
      .classed('node-all-linked', status);
    //highlight links
    _.each(props.clickedIds, (c, i) => {
        //concatnate the previously clicked IDs with added IDs
        //splice its own id
        _.each(props.mutualLinkedNodes.concat(_.cloneDeep(props.clickedIds).splice(i)), (id) => {
          const combination = `${Math.min(+c, +id)}-${Math.max(+c, +id)}`;
          d3.selectAll(`line[id="${combination}"]`).classed('link-all-linked', status);
        });
    });
  }

  componentWillReceiveProps(nextProps) {
    //option change
    if (this.props.graph !== nextProps.graph) {
      this.updateGraph(nextProps);
      return false;
    }
    //mouse over/out
    if (this.props.hovered !== nextProps.hovered) {
      _.each(nextProps.connected, (c) => {
        const combination = `${Math.min(+c, +nextProps.hoveredId)}-${Math.max(+c, +nextProps.hoveredId)}`;
        d3.select(`circle[id="${nextProps.hoveredId}"]`).classed('node-over', nextProps.hovered);
        d3.select(`line[id="${combination}"]`).classed('link-over', nextProps.hovered);
        d3.select(`circle[id="${c}"]`).classed('node-linked', nextProps.hovered);
      });
      d3.select('.js-network-hover')
        .style('display', `${nextProps.hovered ? 'inline-block' : 'none'}`)
        .style('left', `${d3.event.pageX}px`)
        .style('top', `${d3.event.pageY}px`);
      d3.select('.js-network-content').html(nextProps.hoverText);
    }
    //click
    if (nextProps.clicked || this.props !== nextProps.clicked) {
      d3.select(`circle[id="${nextProps.clickedId}"]`).classed('node-clicked', nextProps.clicked);
      if (this.props.isLinksShown) {
        this.highlightElements(this.props, false);
        this.highlightElements(nextProps, true);
      }
    }
    //removed from the results table
    if (this.props.clickedIds !== nextProps.clickedIds) {
      const removed = _.filter(this.props.clickedIds, (id) => nextProps.clickedIds.indexOf(id) === -1);
      _.each(removed, (id) => {
        d3.select(`circle[id="${id}"]`).classed('node-clicked', false);
        if (this.props.isLinksShown) {
          this.highlightElements(this.props, false);
          this.highlightElements(nextProps, true);
        }
      });
    }
    //links View
    if (this.props.isLinksShown !== nextProps.isLinksShown) {
      this.highlightElements(nextProps, nextProps.isLinksShown);
    }
  }

  componentDidMount() {
    this.drawGraph(this.props);
    if (this.props.clickedIds.length > 0) {
      //highlight clicked circle
      _.each(this.props.clickedIds, (d) => {
        d3.select(`circle[id="${d}"]`).classed('node-clicked', true);
      })
      //highlight link connection
      if (this.props.isLinksShown) {
        this.highlightElements(this.props, true);
      }
    }
  }

  render() {
    return (<div>
      { this.props.clickedIds.length > 1 && <div className="network-options">
        <label className="radio">
          <input
            type="radio"
            name="highlightElms"
            value="network"
            checked={this.props.isLinksShown}
            onChange={this.props.toggleLinkedNodes} /> Both nodes &amp; edges (network)
        </label>
        <label className="radio">
          <input
            type="radio"
            name="highlightElms"
            value="nodes"
            checked={!this.props.isLinksShown}
            onChange={this.props.toggleLinkedNodes} /> Only nodes (selected swimmers)
        </label>
      </div> }
      <div className="network" id="vis-width">
        <svg id="svg" style={{width: '100%'}}>
          <g id="vis-g"></g>
        </svg>
        <div className="vis-hover js-network-hover">
          <div className="hover-content js-network-content"/>
          <div className="arrow-down"/>
        </div>
      </div>
    </div>);
  }
}

export default NetworkComponent;
        // <div className="hovered-swimmer" dangerouslySetInnerHTML={{ __html: this.props.hoverText }} />
import React, { Component, Fragment } from "react";
import { IconButton, Typography } from "@material-ui/core";
import { ArrowBack } from "@material-ui/icons";
import SectionTable from "./SectionTable";
import "./sectiontable.css";

class CourseDetailPane extends Component {
  render() {
    return (
      <div
        style={{
          overflow: "auto",
          height: "100%",
          backgroundColor: "white"
        }}
      >
        <div
          style={{
            display: "inline-flex"
          }}
        >
          <IconButton
            style={{ marginRight: 24 }}
            onClick={this.props.onDismissDetails}
          >
            <ArrowBack />
          </IconButton>

          <Typography variant="title" style={{ flexGrow: "1", marginTop: 12 }}>
            {this.props.courseDetails.name[0] +
              " " +
              this.props.courseDetails.name[1]}
          </Typography>
          <br />
          <Typography variant="body" style={{ flexGrow: "1", marginTop: 12 }}>
            {"Testing this is the course info"}
          </Typography>
        </div>
        <SectionTable
          style={{ marginTop: 12 }}
          courseDetails={this.props.courseDetails}
          onAddClass={this.props.onAddClass}
          deptName={this.props.deptName}
          termName={this.props.termName}
        />
      </div>
    );
  }
}

export default CourseDetailPane;

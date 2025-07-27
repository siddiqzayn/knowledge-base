import React from 'react';
import 'react-quill/dist/quill.snow.css'; // Styles for the editor
import ReactQuill from 'react-quill';

const Editor = ({ content, onChange, readOnly = false }) => {
  // Define the toolbar options for ReactQuill
  const modules = {
    toolbar: [
      [{ header: [1, 2, false] }],
      ['bold', 'italic', 'underline', 'strike'],        // toggled buttons
      ['blockquote', 'code-block'],

      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'script': 'sub'}, { 'script': 'super' }],      // superscript/subscript
      [{ 'indent': '-1'}, { 'indent': '+1' }],          // outdent/indent
      [{ 'direction': 'rtl' }],                         // text direction

      [{ 'size': ['small', false, 'large', 'huge'] }],  // custom dropdown
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],

      [{ 'color': [] }, { 'background': [] }],          // dropdown with defaults
      [{ 'font': [] }],
      [{ 'align': [] }],

      ['link', 'image', 'video'], // link and image, video
      ['clean']                                         // remove formatting button
    ],
  };

  // Define formats that ReactQuill will allow
  const formats = [
    'header', 'font', 'size',
    'bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block',
    'list', 'bullet', 'indent',
    'link', 'image', 'video',
    'color', 'background', 'align', 'script', 'direction'
  ];

  return (
    <ReactQuill
      theme="snow"
      value={content}
      onChange={onChange}
      modules={modules}
      formats={formats}
      readOnly={readOnly} // Make editor read-only if prop is true
      className="bg-white rounded-lg shadow-sm" // Tailwind styles for the editor container
    />
  );
};

export default Editor;
import React from 'react';
import { X, File } from 'lucide-react';
import { AttachedFile } from '../types';

interface Props {
    file: AttachedFile;
    onRemove: () => void;
}

const FileAttachment: React.FC<Props> = ({ file, onRemove }) => {
    return (
        <div className="file-attachment">
            <div className="file-attachment-content">
                <File size={14} />
                <span className="file-name">{file.name}</span>
                <span className="file-path">{file.path}</span>
            </div>
            <button 
                className="remove-button"
                onClick={onRemove}
                title="Remove attachment"
            >
                <X size={14} />
            </button>
        </div>
    );
};

export default FileAttachment;